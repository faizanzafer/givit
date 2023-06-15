const router = require("express").Router();
const { FollowingApproval, GiveAwaysStatus } = require("@prisma/client");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");
const _ = require("lodash");

const { getEnv } = require("../config");
const { userProfileValidation } = require("./validate");
const { getError, getSuccessData, timeExpired } = require("../helpers");
const { getUserfromId } = require("../database_queries/Auth");

router.post("/block_user", trimRequest.body, async (req, res) => {
  try {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { user_id } = value;
    const { _id: my_id } = req.user;

    if (my_id == user_id)
      return res.status(404).send(getError("You cannot block yourself."));

    const secondaryUser = await prisma.users.findFirst({
      where: {
        id: user_id,
        is_registered: true,
      },
      select: {
        id: true,
        followers: {
          where: {
            follower_id: my_id,
          },
        },
        followings: {
          where: {
            following_id: my_id,
          },
        },
        give_aways: {
          where: {
            likes: {
              some: {
                user_id: my_id,
              },
            },
          },
          select: {
            likes: true,
          },
        },
      },
    });
    if (!secondaryUser)
      return res.status(404).send(getError("User do not exist."));

    const isAlreadyBlocked = await prisma.blockedUsers.findFirst({
      where: {
        blocker_id: my_id,
        blocked_id: user_id,
      },
    });
    if (isAlreadyBlocked)
      return res.status(404).send(getError("You already blocked the user."));

    await prisma.blockedUsers.create({
      data: {
        blocker_id: my_id,
        blocked_id: user_id,
      },
    });

    if (secondaryUser.followers.length > 0) {
      await prisma.followRequests.delete({
        where: {
          id: secondaryUser.followers[0].id,
        },
      });
    }
    if (secondaryUser.followings.length > 0) {
      await prisma.followRequests.delete({
        where: {
          id: secondaryUser.followings[0].id,
        },
      });
    }

    return res.send(getSuccessData("Successfully blocked the user."));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/unblock_user", trimRequest.body, async (req, res) => {
  try {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { user_id } = value;
    const { _id: my_id } = req.user;

    if (my_id == user_id)
      return res.status(404).send(getError("You cannot unblock yourself."));

    const secondaryUser = await getUserfromId(user_id);
    if (!secondaryUser)
      return res.status(404).send(getError("User do not exist."));

    const isAlreadyBlocked = await prisma.blockedUsers.findFirst({
      where: {
        blocker_id: my_id,
        blocked_id: user_id,
      },
    });
    if (!isAlreadyBlocked)
      return res.status(404).send(getError("You haven't blocked the user."));

    await prisma.blockedUsers.delete({
      where: {
        id: isAlreadyBlocked.id,
      },
    });
    return res.send(getSuccessData("Successfully unblocked the user."));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.get("/my_blocked_user", trimRequest.body, async (req, res) => {
  try {
    const { _id: my_id } = req.user;

    const myBlockedUsers = await prisma.blockedUsers.findMany({
      where: {
        blocker_id: my_id,
      },
      select: {
        blocked_user: {
          select: {
            id: true,
            name: true,
            user_name: true,
            email: true,
            picture_url: true,
          },
        },
      },
    });
    const blockedUsers = myBlockedUsers.map((user) => user.blocked_user);

    return res.send(getSuccessData(blockedUsers));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

module.exports = router;
