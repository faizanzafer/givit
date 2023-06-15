const router = require("express").Router();
const date = require("date-and-time");
const { FollowingApproval, NotificationType } = require("@prisma/client");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");

const { userProfileValidation } = require("./validate");
const { SendNotification } = require("../Notifications/Notifications");
const { getError, getSuccessData } = require("../helpers");

//

router.post("/follow", trimRequest.all, async (req, res) => {
  const { error, value } = userProfileValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { _id: my_id, user_name } = req.user;
  const { user_id } = value;

  if (my_id == user_id)
    return res
      .status(404)
      .send(getError("You cannot follow or unfollow yourself."));

  try {
    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      select: {
        is_public: true,
        fcm_token: true,
        followers: {
          where: {
            follower_id: my_id,
          },
        },
        users_i_blocked: {
          where: {
            blocked_id: my_id,
          },
        },
        users_blocked_me: {
          where: {
            blocker_id: my_id,
          },
        },
        user_notification_management: true,
      },
    });

    if (!user)
      return res.status(404).send(getError("user does not exist or deleted"));

    if (user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(getError("User blocked you, so you cannot follow him"));

    if (user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(getError("You blocked user, so you cannot follow him"));

    if (user.followers.length > 0) {
      const follower = user.followers[0];
      if (follower.status == FollowingApproval.APPROVED)
        return res
          .status(404)
          .send(getError("You already following this user"));
      else return res.status(404).send(getError("Your request is pending."));
    }

    if (user.is_public == false) {
      await prisma.followRequests.create({
        data: {
          follower_id: my_id,
          following_id: user_id,
          status: FollowingApproval.PENDING,
        },
      });

      const request_status = await getCurrentFollowUnfollowStatus(
        my_id,
        user_id
      );

      // Notification
      const notification = JSON.stringify({
        user1: my_id,
      });

      await prisma.userNotifications
        .create({
          data: {
            type: NotificationType.NEW_FOLLOWER_REQUEST,
            user_id,
            notification,
          },
        })
        .then(async () => {
          if (user.fcm_token) {
            const pushNoti = {
              title: "Follower Request",
              body: `${user_name} requested to follow you.`,
            };
            await SendNotification(user.fcm_token, pushNoti)
              .then((response) => {
                console.log("Successfully sent notification:", response);
              })
              .catch((error) => {
                console.log("Error sending notification:", error);
              });
          }
        });
      // End Notification

      console.log(request_status);
      return res.status(200).send(
        getSuccessData({
          message: "Request sent to user, wait for his approval.",
          request_status,
        })
      );
    }

    await prisma.followRequests.create({
      data: {
        follower_id: my_id,
        following_id: user_id,
        status: FollowingApproval.APPROVED,
      },
    });

    const request_status = await getCurrentFollowUnfollowStatus(my_id, user_id);

    // Notification
    const notification = JSON.stringify({
      user1: my_id,
    });

    await prisma.userNotifications
      .create({
        data: {
          type: NotificationType.NEW_FOLLOWER,
          user_id,
          notification,
        },
      })
      .then(async () => {
        if (user.fcm_token && user.user_notification_management?.new_follower) {
          const pushNoti = {
            title: "New Follower",
            body: `${user_name} started following you.`,
          };
          await SendNotification(user.fcm_token, pushNoti)
            .then((response) => {
              console.log("Successfully sent notification:", response);
            })
            .catch((error) => {
              console.log("Error sending notification:", error);
            });
        }
      });
    // End Notification

    return res.status(200).send(
      getSuccessData({
        message: "You are now following this user.",
        request_status,
      })
    );
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/accept_follow_request", trimRequest.all, async (req, res) => {
  const { error, value } = userProfileValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const my_id = req.user._id;
  const { user_id } = value;

  if (my_id == user_id)
    return res
      .status(404)
      .send(getError("You cannot follow or unfollow yourself."));

  try {
    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      select: {
        is_public: true,
        followings: {
          where: {
            following_id: my_id,
          },
        },
      },
    });

    if (!user)
      return res.status(404).send(getError("user does not exist or deleted"));

    if (user.followings.length > 0) {
      const following = user.followings[0];
      if (following.status == FollowingApproval.APPROVED)
        return res.status(404).send(getError("Request already accepted."));
      else {
        await prisma.followRequests.update({
          where: {
            id: following.id,
          },
          data: {
            status: FollowingApproval.APPROVED,
          },
        });
        const request_status = await getCurrentFollowUnfollowStatus(
          my_id,
          user_id
        );
        return res.status(200).send(
          getSuccessData({
            message: "Request accepted.",
            request_status,
          })
        );
      }
    }

    return res.status(404).send(getError("Invalid request approval."));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/decline_follow_request", trimRequest.all, async (req, res) => {
  const { error, value } = userProfileValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const my_id = req.user._id;
  const { user_id } = value;

  if (my_id == user_id)
    return res
      .status(404)
      .send(getError("You cannot follow or unfollow yourself."));

  try {
    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      select: {
        is_public: true,
        followings: {
          where: {
            following_id: my_id,
          },
        },
      },
    });

    if (!user)
      return res.status(404).send(getError("user does not exist or deleted"));

    if (user.followings.length > 0) {
      await prisma.followRequests.delete({
        where: { id: user.followings[0].id },
      });
      const request_status = await getCurrentFollowUnfollowStatus(
        my_id,
        user_id
      );
      return res.status(200).send(
        getSuccessData({
          message: "Request declined.",
          request_status,
        })
      );
    }

    return res.status(404).send(getError("Invalid request decline."));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/unfollow", trimRequest.all, async (req, res) => {
  const { error, value } = userProfileValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const my_id = req.user._id;
  const { user_id } = value;

  if (my_id == user_id)
    return res
      .status(404)
      .send(getError("You cannot follow unfollow yourself."));

  try {
    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      select: {
        is_public: true,
        followers: {
          where: {
            follower_id: my_id,
          },
        },
        users_i_blocked: {
          where: {
            blocked_id: my_id,
          },
        },
        users_blocked_me: {
          where: {
            blocker_id: my_id,
          },
        },
      },
    });

    if (!user)
      return res.status(404).send(getError("user does not exist or deleted"));

    if (user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(getError("User blocked you, so you cannot unfollow him"));

    if (user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(getError("You blocked user, so you cannot unfollow him"));

    if (user.followers.length <= 0)
      return res
        .status(404)
        .send(
          getError(
            "You cannot unfollow this user, because you are not following yet."
          )
        );

    await prisma.followRequests.delete({
      where: { id: user.followers[0].id },
    });
    const request_status = await getCurrentFollowUnfollowStatus(my_id, user_id);

    return res.status(200).send(
      getSuccessData({
        message: "Unfollow successfully.",
        request_status,
      })
    );
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/remove_follower", trimRequest.all, async (req, res) => {
  const { error, value } = userProfileValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const my_id = req.user._id;
  const { user_id } = value;

  if (my_id == user_id)
    return res
      .status(404)
      .send(getError("You cannot follow unfollow yourself."));

  try {
    const follower = await prisma.followRequests.findFirst({
      where: {
        following_id: my_id,
        follower_id: user_id,
        status: FollowingApproval.APPROVED,
      },
    });

    if (!follower)
      return res
        .status(404)
        .send(getError("User is not in your follower list."));

    await prisma.followRequests.delete({
      where: { id: follower.id },
    });

    const request_status = await getCurrentFollowUnfollowStatus(my_id, user_id);

    return res.status(200).send(
      getSuccessData({
        message: "Follower removed successfully.",
        request_status,
      })
    );
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

const getCurrentFollowUnfollowStatus = async (my_id, user_id) => {
  const user = await prisma.users.findFirst({
    where: {
      id: user_id,
    },
    select: {
      followers: {
        where: {
          following_id: user_id,
        },
      },
      followings: {
        where: {
          follower_id: user_id,
        },
      },
    },
  });

  let hisAndMyFollowRelation = user.followers.find(
    (follower) => follower.follower_id == my_id
  );

  if (!hisAndMyFollowRelation) {
    hisAndMyFollowRelation = user.followings.find(
      (follower) => follower.following_id == my_id
    );
    if (!hisAndMyFollowRelation) {
      user.his_and_my_follow_relation = null;
    } else {
      user.his_and_my_follow_relation = {
        type: 2,
        status: hisAndMyFollowRelation.status,
      };
    }
  } else {
    user.his_and_my_follow_relation = {
      type: 1,
      status: hisAndMyFollowRelation.status,
    };
  }

  return user.his_and_my_follow_relation;
};

module.exports = router;
