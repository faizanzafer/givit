const router = require("express").Router();
const date = require("date-and-time");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");

const { postValidation } = require("./validate");
const { getError, getSuccessData } = require("../helpers");
const { NotificationType } = require("@prisma/client");
const { SendNotification } = require("../Notifications/Notifications");

//

router.post("/like", trimRequest.all, async (req, res) => {
  const { error, value } = postValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { _id: user_id, user_name } = req.user;
  const { post_id } = value;

  try {
    const post = await prisma.giveAways.findFirst({
      where: {
        id: post_id,
      },
      include: {
        likes: {
          where: {
            user_id,
          },
        },
        user: {
          select: {
            id: true,
            fcm_token: true,
            users_blocked_me: {
              where: {
                blocker_id: user_id,
              },
            },
            users_i_blocked: {
              where: {
                blocked_id: user_id,
              },
            },
            user_notification_management: true,
          },
        },
      },
    });

    if (!post)
      return res.status(404).send(getError("Post does not exist or deleted"));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(getError("User blocked you, so you cannot like his post"));

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(getError("You blocked user, so you cannot like his post"));

    if (post && post.likes && post.likes.length > 0)
      return res.status(404).send(getError("You already liked this post"));

    await prisma.giveAwayLikes
      .create({
        data: { user_id, give_away_id: post.id },
      })
      .then(async () => {
        // Notification
        if (post.user.id != user_id) {
          const notification = JSON.stringify({
            user1: user_id,
            give_away: post_id,
          });

          await prisma.userNotifications
            .create({
              data: {
                type: NotificationType.POST_LIKE,
                user_id: post.user_id,
                notification,
              },
            })
            .then(async () => {
              if (
                post.user.fcm_token &&
                post.user.user_notification_management?.post_like
              ) {
                const pushNoti = {
                  title: "Post like",
                  body: `${user_name} liked your post.`,
                };
                await SendNotification(post.user.fcm_token, pushNoti)
                  .then((response) => {
                    console.log("Successfully sent notification:", response);
                  })
                  .catch((error) => {
                    console.log("Error sending notification:", error);
                  });
              }
            });
        }
        // End Notification
      });

    return res.status(200).send(getSuccessData("Post successfully liked"));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/dislike", trimRequest.all, async (req, res) => {
  const { error, value } = postValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const user_id = req.user._id;
  const { post_id } = value;

  try {
    const post = await prisma.giveAways.findFirst({
      where: {
        id: post_id,
      },
      include: {
        likes: {
          where: {
            user_id,
          },
        },
        user: {
          select: {
            users_blocked_me: {
              where: {
                blocker_id: user_id,
              },
            },
            users_i_blocked: {
              where: {
                blocked_id: user_id,
              },
            },
          },
        },
      },
    });

    if (!post)
      return res.status(404).send(getError("Post does not exist or deleted"));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(getError("User blocked you, so you cannot dislike his post"));

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(getError("You blocked user, so you cannot dislike his post"));

    if (post && post.likes && post.likes.length <= 0)
      return res.status(404).send(getError("Only Liked posts can be disliked"));

    await prisma.giveAwayLikes.delete({
      where: {
        user_give_away_like: {
          user_id,
          give_away_id: post_id,
        },
      },
    });

    return res.status(200).send(getSuccessData("Post successfully disliked"));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

module.exports = router;
