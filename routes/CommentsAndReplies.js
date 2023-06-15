const router = require("express").Router();
const trimRequest = require("trim-request");

const { NotificationType } = require("@prisma/client");

const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

const {
  postCommentValidation,
  postCommentRepliesValidation,
  postCommentLikesValidation,
  postCommentReplyLikesValidation,
} = require("./validate");
const { getError, getSuccessData } = require("../helpers");
const {
  dislikeTheCommentReply,
  likeTheCommentReply,
  getPostandItsCommentItsRepliesAndReplyLike,
  dislikeTheComment,
  likeTheComment,
  getPostCommentandItsLikes,
  makeCommentReply,
  getPostAndItsComment,
  makeCommentOnPost,
  getPostFromId,
} = require("../database_queries/CommentsAndReplies");
const { SendNotification } = require("../Notifications/Notifications");
//

router.post("/comment", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = postCommentValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { _id: user_id, user_name } = req.user;
    const { post_id, comment } = value;

    const post = await getPostFromId(post_id, user_id);
    if (!post) return res.status(404).send(getError("Post does not exist."));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(getError("User blocked you, so you cannot comment on his post"));

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(getError("You blocked user, so you cannot comment on his post"));

    const commentData = await makeCommentOnPost(post, user_id, comment).then(
      async (data) => {
        // Notification
        if (post.user.id != user_id) {
          const notification = JSON.stringify({
            user1: user_id,
            give_away: post_id,
            comment: data.comment,
          });

          await prisma.userNotifications
            .create({
              data: {
                type: NotificationType.POST_COMMENT,
                user_id: post.user_id,
                notification,
              },
            })
            .then(async () => {
              if (
                post.user.fcm_token &&
                post.user.user_notification_management?.post_comment_and_reply
              ) {
                const pushNoti = {
                  title: "Post comment",
                  body: `${user_name} commented on your post.`,
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
        return data;
      }
    );

    commentData.likes = 0;
    commentData.is_liked = false;
    commentData.showreplies = false;

    return res.send(getSuccessData(commentData));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/comment_reply", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = postCommentRepliesValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { _id: user_id, user_name } = req.user;
    const { post_id, comment_id, reply } = value;

    const post = await getPostAndItsComment(post_id, comment_id, user_id);
    if (!post) return res.status(404).send(getError("Post does not exist."));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "User blocked you, so you cannot reply to comment on his post"
          )
        );

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "You blocked user, so you cannot reply to comment on his post"
          )
        );

    const comment = post.comments[0];
    if (!comment)
      return res
        .status(404)
        .send(getError("Comment do not exist or already deleted."));

    const commentReplyData = await makeCommentReply(
      user_id,
      comment_id,
      reply
    ).then(async (data) => {
      // Notification
      if (post.user.id != user_id) {
        const notification = JSON.stringify({
          user1: user_id,
          give_away: post_id,
          comment: comment.comment,
        });

        await prisma.userNotifications
          .create({
            data: {
              type: NotificationType.POST_COMMENT_REPLY,
              user_id: comment.user_id,
              notification,
            },
          })
          .then(async () => {
            if (
              comment.user?.fcm_token &&
              comment.user.user_notification_management?.post_comment_and_reply
            ) {
              const pushNoti = {
                title: "Comment reply",
                body: `${user_name} replied at your comment.`,
              };
              await SendNotification(comment.user.fcm_token, pushNoti)
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
      return data;
    });

    commentReplyData.is_liked = false;
    commentReplyData.likes = 0;

    return res.send(getSuccessData(commentReplyData));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/comment_like", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = postCommentLikesValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const user_id = req.user._id;
    const { post_id, comment_id } = value;

    const post = await getPostCommentandItsLikes(post_id, comment_id, user_id);
    if (!post) return res.status(404).send(getError("Post does not exist."));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(
          getError("User blocked you, so you cannot like a comment on his post")
        );

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(
          getError("You blocked user, so you cannot like a comment on his post")
        );

    const comment = post.comments[0];
    if (!comment)
      return res
        .status(404)
        .send(getError("Comment do not exist or already deleted."));

    const comment_like = post.comments[0].likes[0];
    if (comment_like)
      return res
        .status(404)
        .send(getError("You have already liked this comment."));

    await likeTheComment(user_id, comment_id);

    return res.send(getSuccessData("Comment Successfully Liked."));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/comment_delete", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = postCommentLikesValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const user_id = req.user._id;
    const { post_id, comment_id } = value;

    const post = await getPostCommentandItsLikes(post_id, comment_id, user_id);
    if (!post) return res.status(404).send(getError("Post does not exist."));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "User blocked you, so you cannot delete a comment on his post"
          )
        );

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "You blocked user, so you cannot delete a comment on his post"
          )
        );

    const comment = post.comments[0];
    if (!comment)
      return res
        .status(404)
        .send(getError("Comment do not exist or already deleted."));

    await prisma.giveAwayComments.update({
      where: {
        id: comment.id,
      },
      data: {
        is_deleted: true,
      },
    });

    return res.send(getSuccessData("Comment successfully deleted."));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/comment_dislike", trimRequest.all, async (req, res) => {
  const { error, value } = postCommentLikesValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  try {
    const user_id = req.user._id;
    const { post_id, comment_id } = value;

    const post = await getPostCommentandItsLikes(post_id, comment_id, user_id);

    if (!post) return res.status(404).send(getError("Post does not exist."));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "User blocked you, so you cannot dislike a comment on his post"
          )
        );

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "You blocked user, so you cannot dislike a comment on his post"
          )
        );

    const comment = post.comments[0];
    if (!comment)
      return res
        .status(404)
        .send(getError("Comment do not exist or already deleted."));

    const comment_like = post.comments[0].likes[0];
    if (!comment_like)
      return res
        .status(404)
        .send(
          getError("You haven't liked this comment. So you cannot dislike it.")
        );

    await dislikeTheComment(comment_like);

    return res.send(getSuccessData("Comment Successfully disliked."));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/comment_reply_like", trimRequest.all, async (req, res) => {
  const { error, value } = postCommentReplyLikesValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  try {
    const user_id = req.user._id;
    const { post_id, comment_id, reply_id } = value;

    const post = await getPostandItsCommentItsRepliesAndReplyLike(
      post_id,
      comment_id,
      reply_id,
      user_id
    );
    if (!post) return res.status(404).send(getError("Post does not exist."));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "User blocked you, so you cannot like a reply of comment on his post"
          )
        );

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "You blocked user, so you cannot like a reply of comment on his post"
          )
        );

    const comment = post.comments[0];
    if (!comment)
      return res
        .status(404)
        .send(getError("Comment do not exist or already deleted."));

    const comment_reply = post.comments[0].replies[0];
    if (!comment_reply)
      return res
        .status(404)
        .send(getError("Comment Reply do not exist or already deleted."));

    const comment_reply_like = post.comments[0].replies[0].likes[0];
    if (comment_reply_like)
      return res
        .status(404)
        .send(getError("You have already liked this comment reply."));

    await likeTheCommentReply(user_id, reply_id);

    return res.send(getSuccessData("Comment Reply Successfully Liked."));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/comment_reply_dislike", trimRequest.all, async (req, res) => {
  const { error, value } = postCommentReplyLikesValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  try {
    const user_id = req.user._id;
    const { post_id, comment_id, reply_id } = value;

    const post = await getPostandItsCommentItsRepliesAndReplyLike(
      post_id,
      comment_id,
      reply_id,
      user_id
    );

    if (!post) return res.status(404).send(getError("Post does not exist."));

    if (post.user.users_i_blocked.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "User blocked you, so you cannot dislike a reply of comment on his post"
          )
        );

    if (post.user.users_blocked_me.length > 0)
      return res
        .status(404)
        .send(
          getError(
            "You blocked user, so you cannot dislike a reply of comment on his post"
          )
        );

    const comment = post.comments[0];
    if (!comment)
      return res
        .status(404)
        .send(getError("Comment do not exist or already deleted."));

    const comment_reply = post.comments[0].replies[0];
    if (!comment_reply)
      return res
        .status(404)
        .send(getError("Comment Reply do not exist or already deleted."));

    const comment_reply_like = post.comments[0].replies[0].likes[0];
    if (!comment_reply_like)
      return res
        .status(404)
        .send(
          getError(
            "You haven't liked this comment reply. So you cannot dislike it."
          )
        );

    await dislikeTheCommentReply(comment_reply_like);

    return res.send(getSuccessData("Comment Reply Successfully disLiked."));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

module.exports = router;
