const router = require("express").Router();
const { FollowingApproval, GiveAwaysStatus } = require("@prisma/client");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");
const _ = require("lodash");
const fs = require("fs");
const ImageUploader = require("../middlewares/ImageMulter");

const { getEnv } = require("../config");
const {
  userProfileValidation,
  updateProfileValidation,
  userNamelValidation,
} = require("./validate");
const {
  getError,
  getSuccessData,
  timeExpired,
  createToken,
  clean,
} = require("../helpers");
const { getUserFromPhone } = require("../database_queries/Auth");

router.get("/discover_people", async (req, res) => {
  try {
    const my_id = req.user._id;

    const users = await prisma.users.findMany({
      where: {
        NOT: [
          {
            id: my_id,
          },
          {
            users_blocked_me: {
              some: {
                blocker_id: my_id,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        user_name: true,
        email: true,

        picture_url: true,
        give_aways: {
          where: {
            status: GiveAwaysStatus.ACTIVE,
          },
          select: {
            id: true,
            user_id: true,
            type: true,
            amount_per_person: true,
            total_winners: true,
            total_cost: true,
            winner_selection_type: true,
            status: true,
            start_date_time: true,
            end_date_time: true,
            about: true,
            created_at: true,
            updated_at: true,
            comments: true,
            likes: true,
          },
        },
        followers: {
          where: { follower_id: my_id },
        },
        followings: {
          where: {
            following_id: my_id,
          },
        },
      },
    });

    users.forEach((user) => {
      if (user.followers.length <= 0) {
        if (user.followings.length > 0) {
          console.log(user.followings[0]);
          user.his_and_my_follow_relation = {
            type: 2,
            status: user.followings[0].status,
          };
        } else user.his_and_my_follow_relation = null;
      } else {
        user.his_and_my_follow_relation = {
          type: 1,
          status: user.followers[0].status,
        };
      }
      delete user.followers;
      delete user.followings;

      user.give_aways_likes = 0;
      user.give_aways_comments = 0;
      user.give_aways.forEach((give_away) => {
        user.give_aways_likes += give_away.likes.length;
        user.give_aways_comments += give_away.comments.length;
      });

      const len = user.give_aways.length;
      user.give_aways = 0;
      user.give_aways = len;
    });

    const sortedUsers = _.sortBy(users, [
      "give_aways_likes",
      "give_aways_comments",
    ]);

    return res.send(getSuccessData(sortedUsers));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/search_users", trimRequest.body, async (req, res) => {
  try {
    const my_id = req.user._id;

    const { error, value } = userNamelValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { user_name } = value;

    const users = await prisma.users.findMany({
      where: {
        OR: [
          {
            user_name: {
              contains: user_name,
              mode: "insensitive",
            },
            name: {
              contains: user_name,
              mode: "insensitive",
            },
          },
          {
            user_name: {
              contains: user_name,
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: user_name,
              mode: "insensitive",
            },
          },
        ],
        NOT: [
          {
            id: my_id,
          },
          {
            users_blocked_me: {
              some: {
                blocker_id: my_id,
              },
            },
          },
          {
            users_i_blocked: {
              some: {
                blocked_id: my_id,
              },
            },
          },
        ],
        is_registered: true,
      },
      select: {
        id: true,
        name: true,
        user_name: true,
        email: true,

        picture_url: true,
      },
      orderBy: [
        {
          user_name: "asc",
        },
        {
          name: "asc",
        },
      ],
    });
    return res.send(getSuccessData(users));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

module.exports = router;
