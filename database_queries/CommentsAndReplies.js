const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

function dislikeTheCommentReply(comment_reply_like) {
  return prisma.giveAwayCommentRepliesLikes.delete({
    where: {
      id: comment_reply_like.id,
    },
  });
}

function likeTheCommentReply(user_id, reply_id) {
  return prisma.giveAwayCommentRepliesLikes.create({
    data: {
      user_id,
      reply_id,
    },
  });
}

function getPostandItsCommentItsRepliesAndReplyLike(
  post_id,
  comment_id,
  reply_id,
  user_id
) {
  return prisma.giveAways.findUnique({
    where: {
      id: post_id,
    },
    include: {
      comments: {
        where: {
          id: comment_id,
        },
        include: {
          replies: {
            where: {
              id: reply_id,
            },
            include: {
              likes: {
                where: {
                  user_id,
                },
              },
            },
          },
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
}

function dislikeTheComment(comment_like) {
  return prisma.giveAwayCommentLikes.delete({
    where: {
      id: comment_like.id,
    },
  });
}

function likeTheComment(user_id, comment_id) {
  return prisma.giveAwayCommentLikes.create({
    data: {
      user_id,
      comment_id,
    },
  });
}

function getPostCommentandItsLikes(post_id, comment_id, user_id) {
  return prisma.giveAways.findUnique({
    where: {
      id: post_id,
    },
    include: {
      comments: {
        where: {
          id: comment_id,
        },
        include: {
          likes: {
            where: {
              user_id,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
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
}

function makeCommentReply(user_id, comment_id, reply) {
  return prisma.giveAwayCommentReplies.create({
    data: {
      user_id,
      comment_id,
      reply,
    },
    select: {
      comment_id: true,
      created_at: true,
      id: true,
      reply: true,
      updated_at: true,
      user_id: true,
      user: {
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
}

function getPostAndItsComment(post_id, comment_id, my_id) {
  return prisma.giveAways.findUnique({
    where: {
      id: post_id,
    },
    include: {
      comments: {
        where: {
          id: comment_id,
        },
        include: {
          user: {
            include: {
              user_notification_management: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
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
      },
    },
  });
}

function makeCommentOnPost(post, user_id, comment) {
  return prisma.giveAwayComments.create({
    data: {
      give_away_id: post.id,
      user_id,
      comment,
    },
    select: {
      id: true,
      give_away_id: true,
      is_deleted: true,
      comment: true,
      replies: true,
      user_id: true,
      user: {
        select: {
          id: true,
          name: true,
          user_name: true,
          email: true,
          picture_url: true,
        },
      },
      created_at: true,
      updated_at: true,
    },
  });
}

function getPostFromId(post_id, my_id) {
  return prisma.giveAways.findUnique({
    where: {
      id: post_id,
    },
    include: {
      user: {
        select: {
          id: true,
          fcm_token: true,
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
          user_notification_management: true,
        },
      },
    },
  });
}

module.exports = {
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
};
