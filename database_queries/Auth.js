const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

function getUserfromId(id) {
  return prisma.users.findFirst({
    where: {
      id,
      is_registered: true,
    },
  });
}

function getExistingUserFromEmail(email) {
  return prisma.users.findFirst({
    where: {
      email,
      is_registered: true,
    },
  });
}

function checkUserNameTaken(user_name) {
  return prisma.users.findFirst({
    where: {
      user_name,
      is_registered: true,
    },
  });
}

function createUser(
  user,
  user_name,
  name,
  picture_url,
  bottom_bar_picture_url,
  hashPassword,
  subscription_limit,
  social_auth_id
) {
  return prisma.users.update({
    where: {
      id: user.id,
    },
    data: {
      name,
      user_name,
      picture_url,
      bottom_bar_picture_url,
      password: hashPassword,
      is_registered: true,
      subscription_limit,
      social_auth_provider_user_id: social_auth_id,
      user_notification_management: {
        create: {
          new_follower: true,
          new_giveaway: true,
          post_like: true,
          post_comment_and_reply: true,
        },
      },
    },
  });
}

function checkEmailAndPhoneExist(email, phone) {
  return prisma.users.findFirst({
    where: {
      email,
      phone,
      is_registered: false,
    },
  });
}

function getUserFromPhone(phone) {
  return prisma.users.findFirst({
    where: {
      phone,
    },
  });
}

function getUserfromEmail(email) {
  return prisma.users.findFirst({
    where: {
      email,
    },
  });
}

module.exports = {
  getUserfromId,
  getExistingUserFromEmail,
  checkUserNameTaken,
  createUser,
  checkEmailAndPhoneExist,
  getUserFromPhone,
  getUserfromEmail,
};
