const {
  GiveAwaysStatus,
  GiveAwaysWinnerSelectionType,
  NotificationType,
} = require("@prisma/client");
const cron = require("node-cron");
const _ = require("lodash");

const Prisma_Client = require("./Prisma");
const prisma = Prisma_Client.prismaClient;

const {
  isUsersFollowingGiverOnTwitter,
} = require("./TwitterFunctions/Twitter");

const { SendNotification } = require("./Notifications/Notifications");

const RunCron = async () => {
  cron.schedule("0 * * * *", async () => {
    console.log("cron is running every hour");

    const now = new Date();

    const completedPosts = await prisma.giveAways.findMany({
      where: {
        end_date_time: {
          lte: now,
        },
        status: GiveAwaysStatus.ACTIVE,
      },
      include: {
        subscribers: {
          include: {
            subscriber: true,
          },
        },
        user: true,
      },
    });

    console.log(completedPosts);
    // Making manually selection type posts to winner selection pending.
    const manuallySelections = completedPosts.filter(
      (post) =>
        post.winner_selection_type == GiveAwaysWinnerSelectionType.MANUALLY
    );

    const manuallySelectionsIds = manuallySelections.map((post) => post.id);

    if (manuallySelectionsIds.length > 0) {
      await prisma.giveAways
        .updateMany({
          where: {
            id: {
              in: manuallySelectionsIds,
            },
          },
          data: {
            status: GiveAwaysStatus.WINNERSELECTIONPENDING,
          },
        })
        .then(async () => {
          // Notification
          const notificationBody = manuallySelections.map((post) => {
            const notification = JSON.stringify({
              give_away: post.id,
            });
            const obj = {
              type: NotificationType.MANUALL_GIVEAWAY_ENDED,
              user_id: post.user_id,
              notification,
            };
            return obj;
          });

          if (notificationBody.length > 0) {
            await prisma.userNotifications
              .createMany({
                data: notificationBody,
              })
              .then(async () => {
                for await (const post of manuallySelections) {
                  if (post.user?.fcm_token) {
                    const giveawayEndnotification = {
                      title: "Giveaway Ended",
                      body: "Manual Giveaway ended. Please go select winners.",
                    };
                    await SendNotification(
                      post.user.fcm_token,
                      giveawayEndnotification
                    )
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
                }
              });
          }
          // End Notification
        });
    }
    // End Making manually selection

    //
    //
    //
    //
    //
    //
    //
    //
    //
    //

    // Handling Automatic selection
    const autoSelectionsPosts = completedPosts.filter(
      (post) =>
        post.winner_selection_type == GiveAwaysWinnerSelectionType.AUTOMATIC
    );

    for await (const post of autoSelectionsPosts) {
      const allowedWinners = post.total_winners;

      if (post.twitter_restriction) {
        const giver_social_profiles = post.user.social_profiles
          ? JSON.parse(post.user.social_profiles)
          : post.user.social_profiles;

        if (!giver_social_profiles?.twitter_profile) {
          continue;
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
            if (_twitterErr) continue;

            post.subscribers.forEach((sub) => {
              const isFollowingOnTwitter = data.find(
                (d) =>
                  d.user_id == sub.subscriber.id && d.can_be_selected == true
              );
              if (isFollowingOnTwitter) sub.can_be_selected = true;
            });
          } catch (twitterErr) {
            if (twitterErr.response.status == 429) {
              console.log("cronJobtwitterErr", twitterErr.response.data);
            } else {
              console.log("cronJobtwitterErr", twitterErr);
            }
            continue;
          }
        }
      } else {
        post.subscribers.forEach((sub) => (sub.can_be_selected = true));
      }

      post.subscribers = post.subscribers.filter(
        (sub) => sub.can_be_selected == true
      );

      const subscribersLen = post.subscribers.length;
      const selectedWinnersIds = [];

      function getWinner() {
        const winner = post.subscribers[_.random(0, subscribersLen - 1)];
        const isAlreadySelected = selectedWinnersIds.find(
          (id) => id == winner.user_id
        );
        if (isAlreadySelected) {
          return getWinner();
        }

        return winner.user_id;
      }

      const winnersLen =
        subscribersLen >= allowedWinners ? allowedWinners : subscribersLen;

      for (let i = 0; i < winnersLen; i++) {
        selectedWinnersIds.push(getWinner());
      }

      const perPersonAmount = post.total_cost / selectedWinnersIds.length;

      // updating giveaway status, making winners and then adding notifications in db
      await prisma.giveAways
        .update({
          where: {
            id: post.id,
          },
          data: {
            status: GiveAwaysStatus.ENDED,
            subscribers: {
              updateMany: {
                where: {
                  user_id: {
                    in: selectedWinnersIds,
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
          const notification = JSON.stringify({
            give_away: post.id,
          });

          const notificationBody = selectedWinnersIds.map((winnerId) => {
            const obj = {
              type: NotificationType.WON_GIVEAWAY,
              user_id: winnerId,
              notification,
            };
            return obj;
          });

          notificationBody.push({
            type: NotificationType.AUTOMATIC_GIVEAWAY_ENDED,
            user_id: post.user_id,
            notification,
          });

          if (notificationBody.length > 0) {
            await prisma.userNotifications
              .createMany({
                data: notificationBody,
              })
              .then(async () => {
                if (post.user?.fcm_token) {
                  const giveawayEndnotification = {
                    title: "Giveaway Ended",
                    body: "Automatic giveaway ended and winners are selected.",
                  };
                  await SendNotification(
                    post.user.fcm_token,
                    giveawayEndnotification
                  )
                    .then((response) => {
                      console.log("Successfully sent notification:", response);
                    })
                    .catch((error) => {
                      console.log("Error sending notification:", error);
                    });
                }
                notificationBody.forEach(async (noti) => {
                  if (noti.user_id != post.user_id) {
                    const user = post.subscribers.find(
                      (sub) => sub.user_id == noti.user
                    );

                    if (user && user.subscriber.fcm_token) {
                      const giveawayEndnotification = {
                        title: "Giveaway Ended",
                        body: "Automatic giveaway ended and you are selected as winner.",
                      };
                      await SendNotification(
                        user.subscriber.fcm_token,
                        giveawayEndnotification
                      )
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
                  }
                });
              });
          }
          // End Notification
        });
    }
  });
};

module.exports = RunCron;
