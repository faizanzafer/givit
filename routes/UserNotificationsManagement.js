const router = require("express").Router();
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");
const { getError, getSuccessData, createToken } = require("../helpers");
const { NotificationType } = require(".prisma/client");

//

router.get("/turn_on_all_notifications", trimRequest.all, async (req, res) => {
  try {
    const { _id: user_id } = req.user;
    const UNM = await prisma.userNotificationManagement.findFirst({
      where: {
        user_id,
      },
    });
    if (UNM) {
      await prisma.userNotificationManagement.update({
        where: {
          id: UNM.id,
        },
        data: {
          new_follower: true,
          new_giveaway: true,
          post_like: true,
          post_comment_and_reply: true,
        },
      });
    } else {
      await prisma.userNotificationManagement.create({
        data: {
          user_id,
          new_follower: true,
          new_giveaway: true,
          post_like: true,
          post_comment_and_reply: true,
        },
      });
    }
    return res.send(getSuccessData(await createToken(req.user)));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.get("/turn_off_all_notifications", trimRequest.all, async (req, res) => {
  try {
    const { _id: user_id } = req.user;
    const UNM = await prisma.userNotificationManagement.findFirst({
      where: {
        user_id,
      },
    });
    if (UNM) {
      await prisma.userNotificationManagement.update({
        where: {
          id: UNM.id,
        },
        data: {
          new_follower: false,
          new_giveaway: false,
          post_like: false,
          post_comment_and_reply: false,
        },
      });
    } else {
      await prisma.userNotificationManagement.create({
        data: {
          user_id,
          new_follower: false,
          new_giveaway: false,
          post_like: false,
          post_comment_and_reply: false,
        },
      });
    }
    return res.send(getSuccessData(await createToken(req.user)));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.get(
  "/toggle_new_follower_notification",
  trimRequest.all,
  async (req, res) => {
    try {
      const { _id: user_id } = req.user;
      const UNM = await prisma.userNotificationManagement.findFirst({
        where: {
          user_id,
        },
      });
      if (UNM) {
        await prisma.userNotificationManagement.update({
          where: {
            id: UNM.id,
          },
          data: {
            new_follower: !UNM.new_follower,
          },
        });
      } else {
        await prisma.userNotificationManagement.create({
          data: {
            user_id,
            new_follower: true,
            new_giveaway: true,
            post_like: true,
            post_comment_and_reply: true,
          },
        });
      }
      return res.send(getSuccessData(await createToken(req.user)));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.get(
  "/toggle_new_giveaway_notification",
  trimRequest.all,
  async (req, res) => {
    try {
      const { _id: user_id } = req.user;
      const UNM = await prisma.userNotificationManagement.findFirst({
        where: {
          user_id,
        },
      });
      if (UNM) {
        await prisma.userNotificationManagement.update({
          where: {
            id: UNM.id,
          },
          data: {
            new_giveaway: !UNM.new_giveaway,
          },
        });
      } else {
        await prisma.userNotificationManagement.create({
          data: {
            user_id,
            new_follower: true,
            new_giveaway: true,
            post_like: true,
            post_comment_and_reply: true,
          },
        });
      }

      return res.send(getSuccessData(await createToken(req.user)));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.get(
  "/toggle_post_like_notification",
  trimRequest.all,
  async (req, res) => {
    try {
      const { _id: user_id } = req.user;
      const UNM = await prisma.userNotificationManagement.findFirst({
        where: {
          user_id,
        },
      });
      if (UNM) {
        await prisma.userNotificationManagement.update({
          where: {
            id: UNM.id,
          },
          data: {
            post_like: !UNM.post_like,
          },
        });
      } else {
        await prisma.userNotificationManagement.create({
          data: {
            user_id,
            new_follower: true,
            new_giveaway: true,
            post_like: true,
            post_comment_and_reply: true,
          },
        });
      }
      return res.send(getSuccessData(await createToken(req.user)));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.get(
  "/toggle_post_comment_and_reply_notification",
  trimRequest.all,
  async (req, res) => {
    try {
      const { _id: user_id } = req.user;
      const UNM = await prisma.userNotificationManagement.findFirst({
        where: {
          user_id,
        },
      });
      if (UNM) {
        await prisma.userNotificationManagement.update({
          where: {
            id: UNM.id,
          },
          data: {
            post_comment_and_reply: !UNM.post_comment_and_reply,
          },
        });
      } else {
        await prisma.userNotificationManagement.create({
          data: {
            user_id,
            new_follower: true,
            new_giveaway: true,
            post_like: true,
            post_comment_and_reply: true,
          },
        });
      }

      return res.send(getSuccessData(await createToken(req.user)));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.get("/get_my_notifications", trimRequest.body, async (req, res) => {
  try {
    const { _id: user_id } = req.user;

    const notifications = await prisma.userNotifications.findMany({
      where: {
        user_id,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    for await (const notification of notifications) {
      notification.notification = JSON.parse(notification.notification);

      if (notification.notification?.user1) {
        const user1 = await prisma.users.findFirst({
          where: {
            id: notification.notification.user1,
          },
          select: {
            id: true,
            name: true,
            user_name: true,
            email: true,
            picture_url: true,
          },
        });

        notification.notification.user1 = user1;
      }

      if (notification.notification?.give_away) {
        const give_away = await prisma.giveAways.findFirst({
          where: {
            id: notification.notification.give_away,
          },
          select: {
            id: true,
            about: true,
            status: true,
            total_cost: true,
          },
        });

        notification.notification.give_away = give_away;
      }
    }

    return res.send(getSuccessData(notifications));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

module.exports = router;
