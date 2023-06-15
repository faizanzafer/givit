const router = require("express").Router();
const date = require("date-and-time");
const rn = require("random-number");
const timediff = require("timediff");
const { now } = require("mongoose");
const _ = require("lodash");

const {
  GiveAwaysWinnerSelectionType,
  GiveAwaysStatus,
  FollowingApproval,
  NotificationType,
  UserRanks,
} = require("@prisma/client");
const trimRequest = require("trim-request");

const FlutterWave = require("../Flutterwave");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

const verifyToken = require("../middlewares/AuthMiddleware");
const AnonomousUser = require("../middlewares/AnonomousUser");
const {
  giveAwayValidation,
  giveAwayPaymentVerificationValidation,
  postValidation,
  postWinnerSelectionValidation,
  postFeedbackValidation,
} = require("./validate");
const { getError, getSuccessData, ERROR_CODES } = require("../helpers");
const { getEnv } = require("../config");
const {
  isUsersFollowingGiverOnTwitter,
} = require("../TwitterFunctions/Twitter");
const { SendNotification } = require("../Notifications/Notifications");

//
//

router.post(
  "/create_giveaway",
  [verifyToken, trimRequest.body],
  async (req, res) => {
    try {
      const { error, value } = giveAwayValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const {
        _id: user_id,
        email,
        social_profiles: _social_profiles,
      } = req.user;

      const {
        amount_per_person,
        total_winners,
        winner_selection_type,
        end_time,
        end_date,
        about,
        card_number,
        name_on_card,
        expiry_month,
        expiry_year,
        cvv,
        card_pin,
        is_response_required,
        twitter_restriction,
      } = req.body;

      const end_date_time = ValidateEndDateTime({
        end_date,
        end_time,
      });

      if (end_date_time && end_date_time.error) {
        return res.status(404).send(end_date_time);
      }

      // checking for twitter profile
      if (twitter_restriction) {
        const social_profiles = _social_profiles
          ? JSON.parse(_social_profiles)
          : _social_profiles;

        if (!social_profiles?.twitter_profile) {
          return res.status(404).send({
            code: ERROR_CODES.twitter_add,
            error: "Please connect your twitter account.",
          });
        }
      }
      //

      const key = getEnv("FLUTTERWAVE_ENCRYPTION_KEY");

      const random = rn.generator({
        min: 1111111,
        max: 9999999,
        integer: true,
      })();

      const card_details = {
        card_number,
        cvv,
        expiry_month,
        expiry_year,
        currency: "NGN",
        amount: amount_per_person * total_winners,
        fullname: name_on_card,
        email,
        tx_ref: random.toString(),
        // redirect_url: "https://webhook.site/3ed41e38-2c79-4c79-b455-97398730866c",
        enckey: key,
        authorization: {
          mode: "pin",
          fields: ["pin"],
          pin: card_pin,
        },
      };
      const flw = FlutterWave.Flw;

      try {
        const apiResponse = await flw.Charge.card(card_details);
        if (apiResponse?.meta?.authorization?.mode == "otp") {
          const newGiveAway = await prisma.giveAways.create({
            data: {
              amount_per_person,
              total_winners,
              total_cost: amount_per_person * total_winners,
              winner_selection_type,
              end_date_time,
              complete_end_date_time: `${end_date} ${end_time}`,
              about,
              user_id,
              is_response_required,
              twitter_restriction,
              give_away_pending_payment: {
                create: {
                  user_id,
                  flw_ref: apiResponse.data.flw_ref,
                },
              },
            },
          });

          console.log("newGiveAway end_date_time", newGiveAway.end_date_time);

          return res.send(
            getSuccessData({
              message: "Give Away created with pending payment verification",
              give_away_id: newGiveAway.id,
              otp_required: true,
            })
          );
        } else if (apiResponse.meta?.authorization?.mode == "redirect") {
          return res.status(404).send(getError("Pin is wrong."));
        } else {
          console.log(apiResponse);

          return res
            .status(404)
            .send(
              getError(
                apiResponse?.message
                  ? apiResponse.message
                  : "Error making payment."
              )
            );
        }
      } catch (flwErr) {
        console.log("flwErr", flwErr);
        if (flwErr?.response?.data?.message) {
          return res.status(404).send(getError(flwErr.response.data.message));
        }
        return res.status(404).send(getError(flwErr.message));
      }
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
  "/giveaway_payment_verification",
  [verifyToken, trimRequest.body],
  async (req, res) => {
    try {
      const { error, value } = giveAwayPaymentVerificationValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { _id: user_id, rank, fcm_token } = req.user;
      const { otp, give_away_id } = req.body;

      const giveAway = await prisma.giveAways.findFirst({
        where: { id: give_away_id },
        include: {
          user: true,
        },
      });
      if (!giveAway) {
        return res.status(404).send(getError("GiveAway does not exist."));
      }

      if (giveAway.status != GiveAwaysStatus.PAYMENTPENDING) {
        return res
          .status(404)
          .send(
            getError("GiveAway does not have payment pending verification.")
          );
      }

      const pendingVerification =
        await prisma.giveAwaysPendingPayment.findFirst({
          where: { user_id, give_away_id },
        });
      if (!pendingVerification) {
        return res
          .status(404)
          .send(
            getError(
              "Payment pending for this giveaway verification does not exist."
            )
          );
      }

      const flw = FlutterWave.Flw;
      try {
        await flw.Charge.validate({
          otp,
          flw_ref: pendingVerification.flw_ref,
        });
      } catch (flwErr) {
        console.log("flwErr", flwErr);

        return res.status(404).send(getError(flwErr.message));
      }

      await prisma.giveAways
        .update({
          where: { id: giveAway.id },
          data: {
            status: GiveAwaysStatus.ACTIVE,
            payment_confirmed_at: now(),
            give_away_pending_payment: {
              delete: true,
            },
          },
        })
        .then(async () => {
          // Notification
          const followers = await prisma.followRequests.findMany({
            where: {
              following_id: user_id,
              status: FollowingApproval.APPROVED,
            },
            include: {
              following: {
                include: {
                  user_notification_management: true,
                },
              },
            },
          });

          const notification = JSON.stringify({
            user1: user_id,
            give_away: giveAway.id,
          });

          const notificationBody = followers.map((follower) => {
            const obj = {
              type: NotificationType.NEW_GIVEAWAY,
              user_id: follower.follower_id,
              notification,
            };
            return obj;
          });

          await prisma.userNotifications
            .createMany({
              data: notificationBody,
            })
            .then(async () => {
              for await (const follower of followers) {
                if (
                  follower.following.fcm_token &&
                  follower.following.user_notification_management?.new_giveaway
                ) {
                  const postCreateNotification = {
                    title: "New giveaway",
                    body: `${giveAway.user.user_name} created new giveaway, go subscribe it.`,
                  };
                  await SendNotification(
                    follower.following.fcm_token,
                    postCreateNotification
                  )
                    .then((response) => {
                      console.log("Successfully sent notification:", response);
                    })
                    .catch((error) => {
                      console.log("Error sending notification:", error);
                    });
                }
              }
            });
          // End Notification
        });

      const today = new Date();

      const pastMonth = new Date();
      pastMonth.setDate(pastMonth.getDate() - 30);

      const ammount_given_away = await prisma.giveAways.aggregate({
        where: {
          user_id,
          NOT: [
            {
              status: GiveAwaysStatus.PAYMENTPENDING,
            },
          ],
          payment_confirmed_at: {
            gte: pastMonth,
            lte: today,
          },
        },
        _sum: {
          total_cost: true,
        },
      });

      let newRank;
      if (ammount_given_away._sum.total_cost >= 100_000)
        newRank = UserRanks.GOLD;
      else if (ammount_given_away._sum.total_cost >= 100_000 >= 50_000)
        newRank = UserRanks.SILVER;
      else if (ammount_given_away._sum.total_cost >= 100_000 >= 10_000)
        newRank = UserRanks.BRONZE;
      else newRank = null;

      if (rank != newRank) {
        let rankChanged = false;

        // if (
        //   (!rank && newRank == UserRanks.BRONZE) ||
        //   (rank == UserRanks.BRONZE && newRank == UserRanks.SILVER) ||
        //   (rank == UserRanks.SILVER && newRank == UserRanks.GOLD)
        // )

        rankChanged = true;

        if (rankChanged) {
          await prisma.users
            .update({
              where: {
                id: user_id,
              },
              data: {
                rank: newRank,
              },
            })
            .then(async () => {
              const notification = JSON.stringify({
                rank: newRank,
              });
              await prisma.userNotifications
                .create({
                  data: {
                    type: NotificationType.RANK_CHANGE,
                    user_id,
                    notification,
                  },
                })
                .then(async () => {
                  if (fcm_token) {
                    const pushNoti = {
                      title: "Rank changed",
                      body: `Your rank changed from ${rank} to ${newRank}.`,
                    };
                    await SendNotification(fcm_token, pushNoti)
                      .then((response) => {
                        console.log(
                          "Successfully sent notification:",
                          response
                        );
                      })
                      .catch((error) => {
                        console.log("Error sending notification:", error);
                      });
                  }
                });
            });
        }
      }

      return res.send(getSuccessData("Payment Verified."));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.get("/explore_posts", [AnonomousUser], async (req, res) => {
  const user_id = req.user._id;
  try {
    const posts = await prisma.giveAways.findMany({
      where: {
        NOT: [
          { user_id },
          {
            status: GiveAwaysStatus.PAYMENTPENDING,
          },
        ],
        user: {
          NOT: [
            {
              users_i_blocked: {
                some: {
                  blocked_id: user_id,
                },
              },
            },
            {
              users_blocked_me: {
                some: {
                  blocker_id: user_id,
                },
              },
            },
          ],
          OR: [
            { is_public: true },
            {
              followers: {
                some: {
                  follower_id: user_id,
                  status: FollowingApproval.APPROVED,
                },
              },
            },
          ],
        },
      },
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
            user_id,
          },
        },
      },
      orderBy: {
        updated_at: "desc",
      },
    });

    const trending_posts = [];
    const latest_posts = [];
    const just_ended = [];

    // give_away likes section
    posts.forEach((post) => {
      post.time_left_to_end = timeLeftToEnd(post.end_date_time);
      post.showComments = false;

      if (post.subscribers.length > 0) {
        post.is_subscribed = true;
        if (post.subscribers[0].is_winner == true) post.i_am_winner = true;
      } else post.is_subscribed = false;
      delete post.subscribers;

      const is_post_liked_by_me = post.likes.find(
        (like) => like.user_id == user_id
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
        post_comment.showreplies = false;
        if (post_comment.is_deleted) {
          post_comment.comment = "This comment was deleted by the author";
        }

        const is_comment_liked_by_me = post_comment.likes.find(
          (post_comment_like) => post_comment_like.user_id == user_id
        );
        if (is_comment_liked_by_me) post_comment.is_liked = true;
        else post_comment.is_liked = false;

        const post_comments_likes = post_comment.likes.length;
        post_comment.likes = 0;
        post_comment.likes = post_comments_likes;

        // give_away comments replies likes section
        post_comment.replies.forEach((post_comment_reply) => {
          const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
            (post_comment_reply_like) =>
              post_comment_reply_like.user_id == user_id
          );
          if (is_comment_reply_liked_by_me) post_comment_reply.is_liked = true;
          else post_comment_reply.is_liked = false;

          const post_comments_replies_likes = post_comment_reply.likes.length;
          post_comment_reply.likes = 0;
          post_comment_reply.likes = post_comments_replies_likes;
        });
        // ////////////////////////////////////
      });
      // ////////////////////////////////////

      if (post.status == GiveAwaysStatus.ACTIVE) latest_posts.push(post);
      else just_ended.push(post);
    });
    // /////////////////////////////////////

    return res.send(
      getSuccessData({ latest_posts, trending_posts, just_ended })
    );
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.get("/get_home_posts", [verifyToken], async (req, res) => {
  const user_id = req.user._id;
  try {
    const user = await prisma.users.findFirst({
      where: {
        id: user_id,
      },
      select: {
        followings: {
          where: {
            status: FollowingApproval.APPROVED,
            follower: {
              NOT: [
                {
                  users_i_blocked: {
                    some: {
                      blocked_id: user_id,
                    },
                  },
                },
                {
                  users_blocked_me: {
                    some: {
                      blocker_id: user_id,
                    },
                  },
                },
              ],
            },
          },
          select: {
            follower: {
              select: {
                give_aways: {
                  where: {
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
                        name: true,
                        user_name: true,
                        email: true,

                        picture_url: true,
                      },
                    },
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
                        user_id,
                      },
                    },
                  },
                  orderBy: {
                    updated_at: "desc",
                  },
                },
              },
            },
          },
        },
      },
    });

    const latest_posts = [];
    user?.followings.forEach((following) => {
      following.follower?.give_aways.forEach((giveAway) =>
        latest_posts.push(giveAway)
      );
    });

    latest_posts.forEach((post) => {
      post.time_left_to_end = timeLeftToEnd(post.end_date_time);
      post.showComments = false;

      if (post.subscribers.length > 0) {
        post.is_subscribed = true;
        if (post.subscribers[0].is_winner == true) post.i_am_winner = true;
      } else post.is_subscribed = false;
      delete post.subscribers;

      const is_post_liked_by_me = post.likes.find(
        (like) => like.user_id == user_id
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
        post_comment.showreplies = false;
        if (post_comment.is_deleted) {
          post_comment.comment = "This comment was deleted by the author";
        }

        const is_comment_liked_by_me = post_comment.likes.find(
          (post_comment_like) => post_comment_like.user_id == user_id
        );
        if (is_comment_liked_by_me) post_comment.is_liked = true;
        else post_comment.is_liked = false;

        const post_comments_likes = post_comment.likes.length;
        post_comment.likes = 0;
        post_comment.likes = post_comments_likes;

        // give_away comments replies likes section
        post_comment.replies.forEach((post_comment_reply) => {
          const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
            (post_comment_reply_like) =>
              post_comment_reply_like.user_id == user_id
          );
          if (is_comment_reply_liked_by_me) post_comment_reply.is_liked = true;
          else post_comment_reply.is_liked = false;

          const post_comments_replies_likes = post_comment_reply.likes.length;
          post_comment_reply.likes = 0;
          post_comment_reply.likes = post_comments_replies_likes;
        });
        // ////////////////////////////////////
      });
      // ////////////////////////////////////
    });

    const posts = _.orderBy(latest_posts, ["payment_confirmed_at"], "desc");

    return res.send(getSuccessData({ posts }));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/post", [verifyToken, trimRequest.body], async (req, res) => {
  try {
    const { error, value } = postValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { _id: user_id, social_profiles: _social_profiles } = req.user;
    const { post_id } = value;

    const post = await prisma.giveAways.findFirst({
      where: {
        id: post_id,
        NOT: [
          {
            status: GiveAwaysStatus.PAYMENTPENDING,
          },
        ],
        user: {
          NOT: [
            {
              users_i_blocked: {
                some: {
                  blocked_id: user_id,
                },
              },
            },
            {
              users_blocked_me: {
                some: {
                  blocker_id: user_id,
                },
              },
            },
          ],
          OR: [
            { id: user_id },
            { is_public: true },
            {
              followers: {
                some: {
                  follower_id: user_id,
                  status: FollowingApproval.APPROVED,
                },
              },
            },
          ],
        },
      },
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
            user_id,
          },
        },
      },
    });

    if (!post) return res.status(404).send(getError("Post do not exist."));

    post.time_left_to_end = timeLeftToEnd(post.end_date_time);
    post.showComments = false;

    if (post.subscribers.length > 0) {
      post.is_subscribed = true;
      if (post.subscribers[0].is_winner == true) post.i_am_winner = true;
    } else post.is_subscribed = false;
    delete post.subscribers;

    const is_post_liked_by_me = post.likes.find(
      (like) => like.user_id == user_id
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
      post_comment.showreplies = false;
      if (post_comment.is_deleted) {
        post_comment.comment = "This comment was deleted by the author";
      }

      const is_comment_liked_by_me = post_comment.likes.find(
        (post_comment_like) => post_comment_like.user_id == user_id
      );

      if (is_comment_liked_by_me) post_comment.is_liked = true;
      else post_comment.is_liked = false;

      const post_comments_likes = post_comment.likes.length;
      post_comment.likes = 0;
      post_comment.likes = post_comments_likes;

      // give_away comments replies likes section
      post_comment.replies.forEach((post_comment_reply) => {
        const is_comment_reply_liked_by_me = post_comment_reply.likes.find(
          (post_comment_reply_like) =>
            post_comment_reply_like.user_id == user_id
        );
        if (is_comment_reply_liked_by_me) post_comment_reply.is_liked = true;
        else post_comment_reply.is_liked = false;

        const post_comments_replies_likes = post_comment_reply.likes.length;
        post_comment_reply.likes = 0;
        post_comment_reply.likes = post_comments_replies_likes;
      });
      // ////////////////////////////////////
    });
    // ////////////////////////////////////

    return res.send(getSuccessData(post));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post(
  "/post_subscribers",
  [verifyToken, trimRequest.body],
  async (req, res) => {
    try {
      const { error, value } = postValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { _id: my_id, social_profiles: _social_profiles } = req.user;
      const { post_id } = value;

      const post = await prisma.giveAways.findFirst({
        where: {
          id: post_id,
          user_id: my_id,
          NOT: [
            {
              status: GiveAwaysStatus.PAYMENTPENDING,
            },
          ],
        },
        select: {
          end_date_time: true,
          status: true,
          total_winners: true,
          winner_selection_type: true,
          twitter_restriction: true,
          subscribers: {
            select: {
              is_winner: true,
              response: true,
              subscriber: {
                select: {
                  id: true,
                  name: true,
                  user_name: true,
                  email: true,
                  picture_url: true,
                  social_profiles: true,
                },
              },
            },
          },
        },
      });

      if (!post) return res.status(404).send(getError("Post do not exist."));

      if (post.twitter_restriction) {
        const giver_social_profiles = _social_profiles
          ? JSON.parse(_social_profiles)
          : _social_profiles;

        if (!giver_social_profiles?.twitter_profile) {
          return res.status(404).send({
            code: ERROR_CODES.twitter_add,
            error: "Please connect your twitter account.",
          });
        }

        const giverTwitterId = giver_social_profiles.twitter_profile.id;

        const subsAttachTwitter = [];

        post.subscribers.forEach((sub) => {
          if (sub.subscriber.social_profiles) {
            const social_profiles = JSON.parse(sub.subscriber.social_profiles);
            if (social_profiles.twitter_profile) {
              const subTwitter = {
                user_id: sub.subscriber.id,
                twitter_id: social_profiles.twitter_profile.id,
              };
              subsAttachTwitter.push(subTwitter);
            }
          }
          sub.can_be_selected = false;
        });

        if (subsAttachTwitter.length > 0) {
          try {
            const { error: _twitterErr, data } =
              await isUsersFollowingGiverOnTwitter(
                giverTwitterId,
                subsAttachTwitter
              );
            if (_twitterErr) return res.status(404).send(getError(_twitterErr));

            post.subscribers.forEach((sub) => {
              const isFollowingOnTwitter = data.find(
                (d) =>
                  d.user_id == sub.subscriber.id && d.can_be_selected == true
              );
              if (isFollowingOnTwitter) sub.can_be_selected = true;
            });
          } catch (twitterErr) {
            if (twitterErr.response.status == 429) {
              return res.status(404).send(getError(twitterErr.response.data));
            } else return res.status(404).send(getError("Twitter error"));
          }
        }
      } else {
        post.subscribers.forEach((sub) => (sub.can_be_selected = true));
      }

      return res.send(getSuccessData(post));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.post(
  "/select_winners",
  [verifyToken, trimRequest.body],
  async (req, res) => {
    try {
      const { error, value } = postWinnerSelectionValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { _id: my_id } = req.user;
      const { post_id, user_ids } = value;

      const post = await prisma.giveAways.findFirst({
        where: {
          id: post_id,
          user_id: my_id,
          NOT: [
            {
              status: GiveAwaysStatus.PAYMENTPENDING,
            },
          ],
        },
        select: {
          user_id: true,
          end_date_time: true,
          status: true,
          total_cost: true,
          total_winners: true,
          winner_selection_type: true,
          subscribers: {
            select: {
              id: true,
              user_id: true,
              is_winner: true,
              subscriber: true,
            },
          },
        },
      });

      if (!post) return res.status(404).send(getError("Post do not exist."));

      if (post.winner_selection_type == GiveAwaysWinnerSelectionType.AUTOMATIC)
        return res.status(404).send(getError("Winner selection is automatic."));

      if (post.status == GiveAwaysStatus.ENDED)
        return res.status(404).send(getError("Winners already selected."));

      if (post.subscribers.length <= 0)
        return res.status(404).send(getError("This post has no subscriber."));

      const _winners = [];
      let userIdsError =
        user_ids.length > 0 ? null : "user_ids should not be empty.";

      for (const user_id of user_ids) {
        if (!userIdsError) {
          const postSubscriber = post.subscribers.find(
            (sub) => sub.user_id == user_id
          );

          if (!postSubscriber) {
            userIdsError =
              "Data is not valid. Some of the given users are not post subscribers.";
            break;
          }

          if (postSubscriber.is_winner == false) {
            _winners.push(postSubscriber.id);
          }
        }
      }

      if (userIdsError) return res.status(404).send(getError(userIdsError));

      const winners = _.uniq(_winners);

      if (winners.length != post.total_winners)
        return res
          .status(404)
          .send(getError(`Please select ${post.total_winners} winners.`));

      const perPersonAmount = post.total_cost / winners.length;

      await prisma.giveAways
        .update({
          where: {
            id: post_id,
          },
          data: {
            status: GiveAwaysStatus.ENDED,
            subscribers: {
              updateMany: {
                where: {
                  id: {
                    in: winners,
                  },
                },
                data: {
                  is_winner: true,
                  amount_winned: perPersonAmount,
                },
              },
            },
          },
        })
        .then(async () => {
          // Notification
          const postWinners = post.subscribers.filter((sub) =>
            winners.includes(sub.id)
          );

          const notification = JSON.stringify({
            give_away: post.id,
          });

          const notificationBody = postWinners.map((postWinner) => {
            const obj = {
              type: NotificationType.WON_GIVEAWAY,
              user_id: postWinner.user_id,
              notification,
            };
            return obj;
          });

          await prisma.userNotifications
            .createMany({
              data: notificationBody,
            })
            .then(async () => {
              for (const postWinner of postWinners) {
                if (postWinner.subscriber.fcm_token) {
                  const postWinnerNotification = {
                    title: "Giveaway winner",
                    body: "Congratulations, you won a manual giveaway.",
                  };
                  await SendNotification(
                    postWinner.subscriber.fcm_token,
                    postWinnerNotification
                  )
                    .then((response) => {
                      console.log("Successfully sent notification:", response);
                    })
                    .catch((error) => {
                      console.log("Error sending notification:", error);
                    });
                }
              }
            });

          // End Notification
        });

      return res.send(getSuccessData("Users successfully selected as winner"));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.post(
  "/post_result",
  [verifyToken, trimRequest.body],
  async (req, res) => {
    try {
      const { error, value } = postValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { _id: my_id } = req.user;
      const { post_id } = value;

      const post = await prisma.giveAways.findFirst({
        where: {
          id: post_id,
          status: GiveAwaysStatus.ENDED,
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              user_name: true,
              email: true,
              picture_url: true,
            },
          },
          status: true,
          total_winners: true,
          amount_per_person: true,
          winner_selection_type: true,
          subscribers: {
            where: {
              is_winner: true,
            },
            select: {
              user_id: true,
              feed_back: true,
              subscriber: {
                select: {
                  id: true,
                  name: true,
                  user_name: true,
                  email: true,
                  picture_url: true,
                },
              },
            },
          },
        },
      });

      if (!post) return res.status(404).send(getError("Post do not exist."));

      const iAmWinner = post.subscribers.find((sub) => sub.user_id == my_id);
      const _winners = post.subscribers.filter((sub) => sub.user_id != my_id);
      if (iAmWinner) _winners.push(iAmWinner);

      const orderedWinners = _winners.reverse();
      const winners = orderedWinners.map((win) => {
        win.subscriber.feed_back = win.feed_back;
        return win.subscriber;
      });

      delete post.subscribers;
      post.winners = winners;

      return res.send(getSuccessData(post));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

router.post(
  "/leave_post_feedback",
  [verifyToken, trimRequest.body],
  async (req, res) => {
    try {
      const { error, value } = postFeedbackValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { _id: my_id, user_name } = req.user;
      const { post_id, feed_back } = value;

      const post = await prisma.giveAways.findFirst({
        where: {
          id: post_id,
          status: GiveAwaysStatus.ENDED,
        },
        select: {
          user_id: true,
          user: {
            select: {
              fcm_token: true,
            },
          },
          subscribers: {
            where: {
              is_winner: true,
              user_id: my_id,
            },
            select: {
              id: true,
              feed_back: true,
            },
          },
        },
      });

      if (!post) return res.status(404).send(getError("Post do not exist."));

      if (post.subscribers.length <= 0)
        return res
          .status(404)
          .send(getError("You are not the winner of this post."));

      if (post.subscribers[0].feed_back)
        return res
          .status(404)
          .send(getError("You have already left the feedback."));

      await prisma.giveAwaySubscibers
        .update({
          where: {
            id: post.subscribers[0].id,
          },
          data: {
            feed_back,
          },
        })
        .then(async () => {
          // Notification
          const notification = JSON.stringify({
            user1: my_id,
            give_away: post_id,
            feed_back,
          });
          await prisma.userNotifications
            .create({
              data: {
                type: NotificationType.WINNER_FEEDBACK,
                user_id: post.user_id,
                notification,
              },
            })
            .then(async () => {
              if (post.user.fcm_token) {
                const pushNoti = {
                  title: "Winner feedback",
                  body: `${user_name} left a thankyou message for you.`,
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
          // End Notification
        });

      return res.send(getSuccessData("Feedback successfully sent."));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

// Route for time being to verify token for client side again signin
router.get("/verify_token", verifyToken, async (req, res) => {
  return res.send(getSuccessData("Token successfully verified."));
});

const ValidateEndDateTime = ({ end_date, end_time }) => {
  if (!date.isValid(end_time, "HH:mm:ss A", true)) {
    return getError("invalid Time");
  }

  const _1 = new Date(end_date + " " + end_time);
  const _2 = new Date();

  console.log(_1 > _2, _1, _2);

  if (!(_1 > _2)) {
    return getError("end_time should be in future.");
  }

  const end_date_time = date.parse(
    end_date + " " + end_time,
    "YYYY-MM-DD HH:mm:ss A",
    true
  );
  if (isNaN(end_date_time)) {
    return getError("Invalid Date or Time");
  }

  // console.log("_1:", _1);

  return _1;
};

const timeLeftToEnd = (post_end_date_time) => {
  const today = new Date();
  const endingTime = new Date(post_end_date_time);

  // console.log({
  //   today: today,
  //   endingTime: endingTime,
  // });

  if (endingTime - today <= 0) return null;

  const { years, months, days, hours, minutes } = timediff(
    today,
    endingTime,
    "YMDHmS"
  );
  return years > 0
    ? `${years} Years`
    : months > 0
    ? `${months} Months`
    : days > 0
    ? `${days} Days`
    : hours > 0
    ? `${hours} Hours`
    : minutes > 0
    ? `${minutes} Minutes`
    : null;
};

module.exports = router;
