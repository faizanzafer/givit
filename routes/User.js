const router = require("express").Router();
const { FollowingApproval, GiveAwaysStatus } = require("@prisma/client");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");
const _ = require("lodash");
const fs = require("fs");
const sharp = require("sharp");

const ImageUploader = require("../middlewares/ImageMulter");
const { getEnv } = require("../config");
const { isTwitterIdValid } = require("../TwitterFunctions/Twitter");
const {
  userProfileValidation,
  updateProfileValidation,
  updateSocialProfileValidation,
  FCMValidation,
  removeSocialProfileValidation,
} = require("./validate");
const { getError, getSuccessData, createToken, clean } = require("../helpers");
const { getUserFromPhone } = require("../database_queries/Auth");

//

router.post("/user_profile", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { _id: my_id } = req.user;
    const { user_id } = value;

    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      include: {
        give_aways: {
          include: {
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    user_name: true,
                    email: true,

                    picture_url: true,
                  },
                },
                likes: true,
                replies: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        user_name: true,
                        email: true,

                        picture_url: true,
                      },
                    },
                    likes: true,
                  },
                },
              },
            },
            likes: true,
            subscribers: {
              where: {
                user_id: my_id,
              },
            },
          },
          orderBy: {
            payment_confirmed_at: "desc",
          },
        },
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
      },
    });

    if (!user) return res.status(404).send(getError("User do not exist."));

    if (user.users_i_blocked.length > 0)
      return res.status(404).send(getError("User have blocked you."));

    if (user.users_blocked_me.length > 0)
      return res.status(404).send(getError("You have blocked this user."));

    if (user.social_profiles)
      user.social_profiles = JSON.parse(user.social_profiles);

    ////////

    if (user.users_i_blocked.length > 0) {
      user.his_and_my_follow_relation = {
        type: 1,
        status: FollowingApproval.BLOCKED,
      };
    } else {
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
    }

    ////////

    user.followers = user.followers.filter(
      (follower) => follower.status == FollowingApproval.APPROVED
    ).length;
    user.followings = user.followings.filter(
      (following) => following.status == FollowingApproval.APPROVED
    ).length;

    ////////////////////////////////
    user.total_give_aways = 0;
    user.no_of_give_aways = user.give_aways.length;
    user.no_of_active_give_aways = user.give_aways.filter(
      (g) => g.status == GiveAwaysStatus.ACTIVE
    ).length;

    user.give_aways.forEach((post) => {
      user.total_give_aways += post.total_cost;

      if (my_id != user_id) {
        if (post.subscribers.length > 0) {
          post.is_subscribed = true;
          if (post.subscribers[0].is_winner == true) post.i_am_winner = true;
        } else post.is_subscribed = false;
      }
      delete post.subscribers;

      const is_post_liked_by_me = post.likes.find(
        (like) => like.user_id == my_id
      );
      if (is_post_liked_by_me) {
        post.is_liked = true;
      } else {
        post.is_liked = false;
      }
      const post_likes = post.likes.length;
      post.likes = 0;
      post.likes = post_likes;

      // give_away comments likes section
      post.comments.forEach((post_comment) => {
        if (post_comment.is_deleted) {
          post_comment.comment = "This comment was deleted by the author";
        }

        const is_comment_liked_by_me = post_comment.likes.find(
          (post_comment_like) => post_comment_like.user_id == my_id
        );
        if (is_comment_liked_by_me) post_comment.is_liked = true;
        else post_comment.is_liked = false;

        const post_comments_likes = post_comment.likes.length;
        post_comment.likes = 0;
        post_comment.likes = post_comments_likes;

        // give_away comments replies likes section
        post_comment.replies.forEach(
          (post_comment_reply, post_comment_reply_index) => {
            const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
              (post_comment_reply_like) =>
                post_comment_reply_like.user_id == my_id
            );
            if (is_comment_reply_liked_by_me)
              post_comment_reply.is_liked = true;
            else post_comment_reply.is_liked = false;

            const post_comments_replies_likes = post_comment_reply.likes.length;
            post_comment_reply.likes = 0;
            post_comment_reply.likes = post_comments_replies_likes;
          }
        );
        // ////////////////////////////////////
      });
      // ////////////////////////////////////
    });

    user.private_profile = false;

    if (my_id != user_id) {
      if (user.show_give_aways_amount == false) {
        delete user.total_give_aways;
      }
      console.log(
        user.his_and_my_follow_relation == null ||
          (user.his_and_my_follow_relation?.type == 1 &&
            user.his_and_my_follow_relation?.status !=
              FollowingApproval.APPROVED)
      );
      if (
        user.his_and_my_follow_relation == null ||
        !(
          user.his_and_my_follow_relation?.type == 1 &&
          user.his_and_my_follow_relation?.status == FollowingApproval.APPROVED
        )
      ) {
        user.give_aways = [];
        user.private_profile = true;
      }

      if (user.users_blocked_me.length > 0 || user.users_i_blocked.length > 0) {
        user.give_aways = [];
      }
    } else {
      const userSubcribedPosts = await prisma.giveAwaySubscibers.findMany({
        where: {
          user_id,
          NOT: [
            {
              give_away: {
                status: GiveAwaysStatus.PAYMENTPENDING,
              },
            },
          ],
        },
        select: {
          is_winner: true,
          give_away: {
            include: {
              comments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      user_name: true,
                      email: true,

                      picture_url: true,
                    },
                  },
                  likes: true,
                  replies: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          user_name: true,
                          email: true,

                          picture_url: true,
                        },
                      },
                      likes: true,
                    },
                  },
                },
              },
              likes: true,
            },
          },
        },
        orderBy: {
          updated_at: "desc",
        },
      });

      user.my_subscriptions = userSubcribedPosts.map((post) => {
        if (post.is_winner == true) post.give_away.is_winner = true;

        const is_post_liked_by_me = post.give_away.likes.find(
          (like) => like.user_id == my_id
        );
        if (is_post_liked_by_me) {
          post.give_away.is_liked = true;
        } else {
          post.give_away.is_liked = false;
        }
        const post_likes = post.give_away.likes.length;
        post.give_away.likes = 0;
        post.give_away.likes = post_likes;

        // give_away comments likes section
        post.give_away.comments.forEach((post_comment) => {
          if (post_comment.is_deleted) {
            post_comment.comment = "This comment was deleted by the author";
          }

          const is_comment_liked_by_me = post_comment.likes.find(
            (post_comment_like) => post_comment_like.user_id == my_id
          );
          if (is_comment_liked_by_me) post_comment.is_liked = true;
          else post_comment.is_liked = false;

          const post_comments_likes = post_comment.likes.length;
          post_comment.likes = 0;
          post_comment.likes = post_comments_likes;

          // give_away comments replies likes section
          post_comment.replies.forEach(
            (post_comment_reply, post_comment_reply_index) => {
              const is_comment_reply_liked_by_me =
                post_comment_reply.likes.find(
                  (post_comment_reply_like) =>
                    post_comment_reply_like.user_id == my_id
                );
              if (is_comment_reply_liked_by_me)
                post_comment_reply.is_liked = true;
              else post_comment_reply.is_liked = false;

              const post_comments_replies_likes =
                post_comment_reply.likes.length;
              post_comment_reply.likes = 0;
              post_comment_reply.likes = post_comments_replies_likes;
            }
          );
          // ////////////////////////////////////
        });
        // ////////////////////////////////////
        return post.give_away;
      });
    }

    delete user.users_blocked_me;
    delete user.users_i_blocked;

    return res.status(200).send(getSuccessData(user));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/followers", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      select: {
        id: true,
        is_public: true,
        followers: {
          where: {
            status: FollowingApproval.APPROVED,
          },
          select: {
            following: {
              select: {
                id: true,
                user_name: true,
                name: true,
                email: true,
                picture_url: true,
              },
            },
          },
        },
        users_blocked_me: {
          where: { blocker_id: my_id },
        },
        users_i_blocked: {
          where: { blocked_id: my_id },
        },
      },
    });

    if (!user) return res.status(404).send(getError("User do not exist."));

    const followers = user.followers.map((follower) => follower.following);
    delete user.followers;
    user.followers = followers;

    if (user_id != my_id) {
      const iAmFollower = user.followers.find((_) => _.id == my_id);

      if (user.users_i_blocked.length > 0 || user.users_blocked_me.length > 0) {
        user.followers = [];
      } else {
        if (user.is_public == false && !iAmFollower) user.followers = [];
      }
    }

    delete user.is_public;

    return res.status(200).send(getSuccessData(user));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/followings", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = userProfileValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const my_id = req.user._id;
    const { user_id } = value;

    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      select: {
        id: true,
        is_public: true,
        followers: {
          where: {
            follower_id: my_id,
            status: FollowingApproval.APPROVED,
          },
        },
        followings: {
          where: {
            status: FollowingApproval.APPROVED,
          },
          select: {
            follower: {
              select: {
                id: true,
                user_name: true,
                name: true,
                email: true,
                picture_url: true,
              },
            },
          },
        },
        users_blocked_me: {
          where: { blocker_id: my_id },
        },
        users_i_blocked: {
          where: { blocked_id: my_id },
        },
      },
    });

    if (!user) return res.status(404).send(getError("User do not exist."));

    const followings = user.followings.map((following) => following.follower);
    delete user.followings;
    user.followings = followings;

    if (user_id != my_id) {
      const iAmFollower = user.followers.length > 0;

      if (user.users_i_blocked.length > 0 || user.users_blocked_me.length > 0) {
        user.followings = [];
      } else {
        if (user.is_public == false && !iAmFollower) user.followings = [];
      }
    }

    delete user.is_public;
    delete user.followers;

    return res.status(200).send(getSuccessData(user));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.get("/toggle_account_privacy", async (req, res) => {
  try {
    const my_id = req.user._id;
    const user = await prisma.users.findUnique({
      where: {
        id: my_id,
      },
    });

    const updatedUser = await prisma.users.update({
      where: {
        id: my_id,
      },
      data: {
        is_public: !user.is_public,
      },
    });

    return res.send(getSuccessData(await createToken(updatedUser)));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.get("/toggle_give_aways_amount_privacy", async (req, res) => {
  try {
    const my_id = req.user._id;
    const user = await prisma.users.findUnique({
      where: {
        id: my_id,
      },
    });
    const updatedUser = await prisma.users.update({
      where: {
        id: my_id,
      },
      data: {
        show_give_aways_amount: !user.show_give_aways_amount,
      },
    });

    return res.send(getSuccessData(await createToken(updatedUser)));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post(
  "/update_profile",
  [ImageUploader, trimRequest.body],
  async (req, res) => {
    try {
      if (req.file_error) {
        deleteUploadedImage(req);
        return res.status(404).send(getError(req.file_error));
      }

      const { error, value } = updateProfileValidation(req.body);
      if (error) {
        deleteUploadedImage(req);
        return res.status(404).send(getError(error.details[0].message));
      }

      const {
        _id: my_id,
        picture_url,
        bottom_bar_picture_url,
        phone: __phone,
        __bio,
        __gender,
        __dob,
      } = req.user;

      const {
        name,
        phone: _phone,
        bio: _bio,
        gender: _gender,
        dob: _dob,
      } = value;

      if (!_phone && !name && !_bio && !_gender && !_dob && !req.file)
        return res
          .status(404)
          .send(
            getError(
              "Atleast one of them i:e name, phone, bio, gender, dob and image is required"
            )
          );

      const phone = _phone ? "+" + clean(_phone) : __phone;
      const bio = _bio;
      const gender = _gender ? _gender : __gender;

      if (_dob) {
        const { dateError } = verifyAndParseDate(_dob);
        if (dateError) return res.status(404).send(getError(dateError));
      }

      const dob = _dob ? verifyAndParseDate(_dob).dateSuccess : __dob;

      if (_phone) {
        if (phone.startsWith("+92")) {
          if (phone.length != 13) {
            deleteUploadedImage(req);
            return res
              .status(404)
              .send(getError("Phone should be 10 character long."));
          }
        } else if (phone.startsWith("+234")) {
          if (phone.length != 14) {
            deleteUploadedImage(req);
            return res
              .status(404)
              .send(getError("Phone should be 10 or 11 character long."));
          }
        } else {
          deleteUploadedImage(req);
          return res
            .status(404)
            .send(getError("Phone can only starts with +92 or +234"));
        }
        const phoneExists = await getUserFromPhone(phone);
        if (!phoneExists) {
          deleteUploadedImage(req);
          return res
            .status(404)
            .send(getError("First verify your phone then continue."));
        }
        if (phoneExists.is_registered == true && __phone != phoneExists.phone) {
          deleteUploadedImage(req);
          return res
            .status(404)
            .send(getError("This phone number is already registered"));
        }
        if (phoneExists.is_registered == false) {
          const deleteUser = await prisma.users.findFirst({
            where: { id: phoneExists.id },
          });
          console.log(deleteUser);

          if (deleteUser) {
            const giveAwayCommentRepliesLikes =
              prisma.giveAwayCommentRepliesLikes.deleteMany({
                where: {
                  user_id: deleteUser.id,
                },
              });
            const giveAwayCommentReplies =
              prisma.giveAwayCommentReplies.deleteMany({
                where: {
                  user_id: deleteUser.id,
                },
              });
            const giveAwayCommentLikes = prisma.giveAwayCommentLikes.deleteMany(
              {
                where: {
                  user_id: deleteUser.id,
                },
              }
            );
            const giveAwayComments = prisma.giveAwayComments.deleteMany({
              where: {
                user_id: deleteUser.id,
              },
            });
            const giveAwayLikes = prisma.giveAwayLikes.deleteMany({
              where: {
                user_id: deleteUser.id,
              },
            });
            const giveAwaysPendingPayment =
              prisma.giveAwaysPendingPayment.deleteMany({
                where: {
                  user_id: deleteUser.id,
                },
              });
            const giveAwaySubscibers = prisma.giveAwaySubscibers.deleteMany({
              where: {
                user_id: deleteUser.id,
              },
            });
            const giveAways = prisma.giveAways.deleteMany({
              where: {
                user_id: deleteUser.id,
              },
            });
            const channelMessages = prisma.channelMessages.deleteMany({
              where: {
                OR: [
                  {
                    from_id: deleteUser.id,
                  },
                  {
                    to_id: deleteUser.id,
                  },
                ],
              },
            });
            const userChannel = prisma.userChannel.deleteMany({
              where: {
                OR: [
                  {
                    from_id: deleteUser.id,
                  },
                  {
                    to_id: deleteUser.id,
                  },
                ],
              },
            });
            const followRequests = prisma.followRequests.deleteMany({
              where: {
                OR: [
                  {
                    follower_id: deleteUser.id,
                  },
                  {
                    following_id: deleteUser.id,
                  },
                ],
              },
            });
            const blockedUsers = prisma.blockedUsers.deleteMany({
              where: {
                OR: [
                  {
                    blocker_id: deleteUser.id,
                  },
                  {
                    blocked_id: deleteUser.id,
                  },
                ],
              },
            });
            const userBankAccount = prisma.userBankAccount.deleteMany({
              where: {
                user_id: deleteUser.id,
              },
            });
            const userDelete = prisma.users.delete({
              where: { id: phoneExists.id },
            });

            await prisma.$transaction([
              giveAwayCommentRepliesLikes,
              giveAwayCommentReplies,
              giveAwayCommentLikes,
              giveAwayComments,
              giveAwayLikes,
              giveAwaysPendingPayment,
              giveAwaySubscibers,
              giveAways,
              channelMessages,
              userChannel,
              followRequests,
              blockedUsers,
              userBankAccount,
              userDelete,
            ]);
          }
        }
      }

      const newPictureUrl = req.file?.path
        ? `${getEnv("APP_URL")}${req.file.path.split("public")[1]}`
        : picture_url;

      if (req.file?.path) {
        await makeCircleAvater(req);
      }

      const avatarImage = req.file?.path
        ? `${getEnv("APP_URL")}${
            req.file.destination.split("public")[1]
          }/bottom_bar_${req.file.filename}`
        : bottom_bar_picture_url;

      if (req.file?.path && picture_url != null) {
        try {
          const filePath = `public${picture_url.split(getEnv("APP_URL"))[1]}`;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          if (bottom_bar_picture_url) {
            const bottom_bar_filePath = `public${
              bottom_bar_picture_url.split(getEnv("APP_URL"))[1]
            }`;
            if (fs.existsSync(bottom_bar_filePath)) {
              fs.unlinkSync(bottom_bar_filePath);
            }
          }
        } catch (fileUnlinkError) {
          console.log(fileUnlinkError);
        }
      }

      const updatedUser = await prisma.users.update({
        where: {
          id: my_id,
        },
        data: {
          name,
          picture_url: newPictureUrl,
          bottom_bar_picture_url: avatarImage,
          phone,
          bio,
          gender,
          dob,
        },
      });

      return res.send(getSuccessData(await createToken(updatedUser)));
    } catch (catchError) {
      deleteUploadedImage(req);
      if (catchError && catchError.message) {
        return res.status(404).send(getError(catchError.message));
      }
      return res.status(404).send(getError(catchError));
    }
  }
);

router.get("/get_follow_requests", async (req, res) => {
  try {
    const { _id: my_id } = req.user;

    const followRequests = await prisma.users.findUnique({
      where: {
        id: my_id,
      },
      select: {
        followers: {
          where: {
            status: FollowingApproval.PENDING,
          },
          select: {
            following: {
              select: {
                id: true,
                user_name: true,
                name: true,
                email: true,
                picture_url: true,
              },
            },
          },
        },
      },
    });
    const followerRequest = followRequests.followers.map((request) => {
      request.following.his_and_my_follow_relation = {
        type: 2,
        status: FollowingApproval.PENDING,
      };

      return request.following;
    });

    return res.send(getSuccessData(followerRequest));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.get("/get_referal_info", async (req, res) => {
  try {
    const { _id: user_id, user_name, subscription_limit } = req.user;

    const mySubscribedPosts = await prisma.giveAwaySubscibers.count({
      where: {
        user_id,
        give_away: {
          status: GiveAwaysStatus.ACTIVE,
        },
      },
    });

    return res.send(
      getSuccessData({
        referal_code: user_name,
        subscription_limit,
        remaining: subscription_limit - mySubscribedPosts,
      })
    );
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.get("/my_bank_account", trimRequest.body, async (req, res) => {
  try {
    const { _id: my_id } = req.user;

    const myBankAccount = await prisma.userBankAccount.findFirst({
      where: {
        user_id: my_id,
      },
      select: {
        account_number: true,
        bank_name: true,
        account_bank: true,
      },
    });

    return res.send(getSuccessData(myBankAccount));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/update_my_fcm_token", trimRequest.body, async (req, res) => {
  try {
    const { error, value } = FCMValidation(req.body);
    if (error) {
      return res.status(404).send(getError(error.details[0].message));
    }

    const { _id: my_id } = req.user;
    const { fcm_token } = value;

    await prisma.users.update({
      where: {
        id: my_id,
      },
      data: {
        fcm_token,
      },
    });
    return res.send(getSuccessData("Fcm Token updated"));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.get("/delete_my_fcm_token", trimRequest.body, async (req, res) => {
  try {
    const { _id: my_id } = req.user;

    await prisma.users.update({
      where: {
        id: my_id,
      },
      data: {
        fcm_token: null,
      },
    });

    return res.send(getSuccessData("Fcm Token deleted"));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.get("/check_my_twitter_profile", trimRequest.body, async (req, res) => {
  try {
    const { _id: my_id, social_profiles: _social_profiles } = req.user;

    const social_profiles = _social_profiles
      ? JSON.parse(_social_profiles)
      : _social_profiles;

    if (!social_profiles?.twitter_profile)
      return res.status(404).send({
        code: 8948837,
        error: "Please connect your twitter account.",
      });
    return res.send(getSuccessData("Twitter profile exists"));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/add_social_profile", trimRequest.body, async (req, res) => {
  try {
    const { error, value } = updateSocialProfileValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { twitter_profile, instagram_profile } = value;
    const { _id: my_id, social_profiles: _social_profiles } = req.user;

    // const user = await prisma.users.findFirst({
    //   where: {
    //     id: my_id,
    //   },
    // });

    const social_profiles = _social_profiles
      ? JSON.parse(_social_profiles)
      : {};

    if (twitter_profile) {
      const giveAways = await prisma.giveAways.findMany({
        where: {
          NOT: [
            {
              status: {
                in: [GiveAwaysStatus.PAYMENTPENDING, GiveAwaysStatus.ENDED],
              },
            },
          ],
          twitter_restriction: true,
          user_id: my_id,
        },
      });

      if (giveAways.length > 0)
        return res
          .status(404)
          .send(
            getError(
              "Cannot add new twitter profile untill all giveaways that has twitter restriction active are not ended."
            )
          );

      try {
        const checkTwitterId = await isTwitterIdValid(twitter_profile.id);

        console.log(checkTwitterId);
        if (checkTwitterId.errors?.length > 0) {
          return res
            .status(404)
            .send(getError(checkTwitterId.errors[0].detail));
        }
      } catch (twitterErr) {
        console.log("twitterErr", twitterErr);
        if (twitterErr?.response?.status == 429) {
          return res.status(404).send(getError(twitterErr.response.data));
        } else return res.status(404).send(getError("Twitter error"));
      }

      social_profiles.twitter_profile = twitter_profile;
    }

    if (instagram_profile) {
      social_profiles.instagram_profile = instagram_profile;
    }

    await prisma.users.update({
      where: {
        id: my_id,
      },
      data: {
        social_profiles:
          Object.keys(social_profiles).length > 0
            ? JSON.stringify(social_profiles)
            : null,
      },
    });

    return res.send(getSuccessData("Social profile successfully updated."));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/remove_social_profile", trimRequest.body, async (req, res) => {
  try {
    const { error, value } = removeSocialProfileValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { twitter_profile, instagram_profile } = value;
    const { _id: my_id, social_profiles: _social_profiles } = req.user;

    const social_profiles = _social_profiles
      ? JSON.parse(_social_profiles)
      : _social_profiles;

    if (social_profiles) {
      if (twitter_profile && social_profiles?.twitter_profile) {
        const giveAways = await prisma.giveAways.findMany({
          where: {
            NOT: [
              {
                status: {
                  in: [GiveAwaysStatus.PAYMENTPENDING, GiveAwaysStatus.ENDED],
                },
              },
            ],
            twitter_restriction: true,
            user_id: my_id,
          },
        });

        if (giveAways.length > 0)
          return res.send(
            getSuccessData(
              "Cannot remove social profile untill all giveaways that has twitter restriction active are not ended."
            )
          );

        delete social_profiles.twitter_profile;
      } else if (instagram_profile && social_profiles?.instagram_profile) {
        delete social_profiles.instagram_profile;
      }

      await prisma.users.update({
        where: {
          id: my_id,
        },
        data: {
          social_profiles:
            Object.keys(social_profiles).length > 0
              ? JSON.stringify(social_profiles)
              : null,
        },
      });
    }

    return res.send(getSuccessData("Social profile removed successfully."));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

module.exports = router;

function deleteUploadedImage(req) {
  try {
    const file = req.file;
    if (fs.existsSync(file?.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (err) {
    console.log(err);
  }
}

const verifyAndParseDate = (date) => {
  const splitDate = date.split("-");
  if (splitDate?.length == 3) {
    if (splitDate[0].length != 4)
      return { dateError: "Invalid date. Only YYYY-MM-YY format is allowed." };
    if (splitDate[1].length != 2)
      return { dateError: "Invalid date. Only YYYY-MM-YY format is allowed." };
    if (splitDate[2].length != 2)
      return { dateError: "Invalid date. Only YYYY-MM-YY format is allowed." };

    if (parseInt(splitDate[0]) <= 0) return { dateError: "Invalid year." };
    if (parseInt(splitDate[1]) <= 0 || parseInt(splitDate[1]) > 12)
      return { dateError: "Invalid month." };

    if (parseInt(splitDate[1]) == 2) {
      console.log(parseInt(splitDate[0]) % 4);
      if (
        parseInt(splitDate[0]) % 4 == 0 &&
        (parseInt(splitDate[2]) <= 0 || parseInt(splitDate[2]) > 29)
      ) {
        return { dateError: "Invalid date." };
      }
      if (
        parseInt(splitDate[0]) % 4 > 0 &&
        (parseInt(splitDate[2]) <= 0 || parseInt(splitDate[2]) > 28)
      ) {
        return { dateError: "Invalid date." };
      }
    } else {
      if (
        (parseInt(splitDate[1]) % 2 == 1 ||
          parseInt(splitDate[1]) == 8 ||
          parseInt(splitDate[1]) == 10 ||
          parseInt(splitDate[1]) == 12) &&
        parseInt(splitDate[1]) != 9 &&
        parseInt(splitDate[1]) != 11 &&
        (parseInt(splitDate[2]) <= 0 || parseInt(splitDate[2]) > 31)
      ) {
        return { dateError: "Invalid date." };
      } else if (
        ((parseInt(splitDate[1]) % 2 == 0 &&
          parseInt(splitDate[1]) != 8 &&
          parseInt(splitDate[1]) != 10 &&
          parseInt(splitDate[1]) != 12) ||
          parseInt(splitDate[1]) == 9 ||
          parseInt(splitDate[1]) == 11) &&
        (parseInt(splitDate[2]) <= 0 || parseInt(splitDate[2]) > 30)
      ) {
        return { dateError: "Invalid date." };
      }
    }
    return { dateSuccess: date };
  }
  return { dateError: "Invalid date. Only YYYY-MM-YY format is allowed." };
};

function makeCircleAvater(req) {
  const width = 27,
    r = width / 2,
    circleShape = Buffer.from(
      `<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`
    );

  return sharp(req.file.path)
    .resize(width, width)
    .composite([
      {
        input: circleShape,
        blend: "dest-in",
      },
    ])
    .png()
    .toFile(`${req.file.destination}/bottom_bar_${req.file.filename}`);
}
