const router = require("express").Router();

const {
  GiveAwaysStatus,
  FollowingApproval,
  NotificationType,
} = require("@prisma/client");
const trimRequest = require("trim-request");

const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

const verifyToken = require("../middlewares/AuthMiddleware");
const {
  isUserFollowingGiverOnTwitter,
} = require("../TwitterFunctions/Twitter");
const { postSubscribeValidation, postValidation } = require("./validate");
const { getError, getSuccessData, ERROR_CODES } = require("../helpers");
const e = require("express");

//
//

router.post(
  "/subscibe_giveaway",
  [verifyToken, trimRequest.all],
  async (req, res) => {
    try {
      const { error, value } = postSubscribeValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { post_id, response } = value;
      const {
        _id: my_id,
        subscription_limit,
        social_profiles: _subscriber_social_profiles,
      } = req.user;

      const post = await prisma.giveAways.findFirst({
        where: {
          id: post_id,
          NOT: [
            {
              status: GiveAwaysStatus.PAYMENTPENDING,
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              is_public: true,
              social_profiles: true,
              users_blocked_me: {
                where: {
                  blocker_id: my_id,
                },
              },
              users_i_blocked: {
                where: {
                  blocked_id: my_id,
                },
              },
              followers: {
                where: {
                  follower_id: my_id,
                },
              },
            },
          },
          subscribers: {
            where: {
              user_id: my_id,
            },
          },
        },
      });

      if (!post) return res.status(404).send(getError("Post do not exist."));

      if (post.user_id == my_id)
        return res.status(404).send(getError("You cannot join your own post."));

      if (post.is_response_required && !response)
        return res
          .status(404)
          .send(getError("response is required for this post."));

      if (post.user.users_blocked_me.length > 0)
        return res
          .status(404)
          .send(getError("You blocked this user, you cannot join his post."));

      if (post.user.users_i_blocked.length > 0)
        return res
          .status(404)
          .send(getError("User blocked you, you cannot join his post."));

      if (
        post.status != GiveAwaysStatus.ACTIVE ||
        new Date() >= new Date(post.end_date_time)
      )
        return res
          .status(404)
          .send(getError("Post expired, you cannot join this post"));

      if (post.subscribers.length > 0)
        return res
          .status(404)
          .send(getError("You have already joined this post."));

      if (post.user.followers.length <= 0) {
        if (post.user.is_public) {
          await prisma.followRequests
            .create({
              data: {
                follower_id: my_id,
                following_id: post.user.id,
                status: FollowingApproval.APPROVED,
              },
            })
            .then(async () => {
              // Notification
              const notification = JSON.stringify({
                user1: my_id,
              });

              await prisma.userNotifications.create({
                data: {
                  type: NotificationType.NEW_FOLLOWER,
                  user_id: post.user.id,
                  notification,
                },
              });
              // End Notification
            });
        } else {
          return res
            .status(404)
            .send(
              getError(
                "User has privacy so you must follow this user to join its post."
              )
            );
        }
      }

      const userJoinedPosts = await prisma.users.findFirst({
        where: {
          id: my_id,
        },
        select: {
          subscribed_give_aways: {
            where: {
              give_away: {
                status: GiveAwaysStatus.ACTIVE,
              },
            },
          },
          user_bank: true,
        },
      });

      if (!userJoinedPosts.user_bank) {
        return res.status(404).send({
          code: ERROR_CODES.bank_add,
          error: "You must enter your bank account details to join any post",
        });
      }

      if (userJoinedPosts.subscribed_give_aways.length >= subscription_limit) {
        return res
          .status(404)
          .send(
            getError(
              "Your subscription limit reached its end, you cannot join this post."
            )
          );
      }

      if (post.twitter_restriction) {
        const subscriber_social_profiles = _subscriber_social_profiles
          ? JSON.parse(_subscriber_social_profiles)
          : _subscriber_social_profiles;

        if (!subscriber_social_profiles?.twitter_profile) {
          return res.status(404).send({
            code: ERROR_CODES.twitter_add,
            error: "Please connect your twitter account.",
          });
        }

        const giver_social_profiles = JSON.parse(post.user.social_profiles);
        const giverTwitterId = giver_social_profiles.twitter_profile.id;

        const subscriberTwitterId =
          subscriber_social_profiles.twitter_profile.id;

        // checking is subscriber is giver's twitter follower
        try {
          const { error, data } = await isUserFollowingGiverOnTwitter(
            giverTwitterId,
            subscriberTwitterId
          );
          if (error) return res.status(404).send(getError(error));
        } catch (twitterErr) {
          if (twitterErr.response.status == 429) {
            return res.status(404).send(getError(twitterErr.response.data));
          } else return res.status(404).send(getError("Twitter error"));
        }
      }

      await prisma.giveAwaySubscibers.create({
        data: {
          give_away_id: post_id,
          response: response ? response : null,
          user_id: my_id,
        },
      });

      return res.send(getSuccessData("Successfully joined post."));
    } catch (err) {
      console.log("err", err);
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.post(
  "/unsubscibe_giveaway",
  [verifyToken, trimRequest.all],
  async (req, res) => {
    try {
      const { error, value } = postValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { post_id } = value;
      const { _id: my_id, subscription_limit } = req.user;

      const post = await prisma.giveAways.findFirst({
        where: {
          id: post_id,
          NOT: [
            {
              status: GiveAwaysStatus.PAYMENTPENDING,
            },
          ],
        },
        include: {
          user: {
            select: {
              users_blocked_me: {
                where: {
                  blocker_id: my_id,
                },
              },
              users_i_blocked: {
                where: {
                  blocked_id: my_id,
                },
              },
              followers: {
                where: {
                  follower_id: my_id,
                },
              },
            },
          },
          subscribers: {
            where: {
              user_id: my_id,
            },
          },
        },
      });

      if (!post) return res.status(404).send(getError("Post do not exist."));

      if (post.user_id == my_id)
        return res
          .status(404)
          .send(getError("You cannot unsubscribe your own post."));

      if (post.subscribers.length <= 0)
        return res.status(404).send(getError("You haven't joined this post."));

      if (
        post.status == GiveAwaysStatus.ENDED ||
        new Date() > new Date(post.end_date_time)
      )
        return res
          .status(404)
          .send(getError("Post expired, you cannot unsubscribe this post"));

      await prisma.giveAwaySubscibers.delete({
        where: {
          id: post.subscribers[0].id,
        },
      });

      return res.send(getSuccessData("Successfully unsubscribed from post."));
    } catch (err) {
      console.log("err", err);
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

module.exports = router;
