const { now } = require("mongoose");
const timediff = require("timediff");
const jwt = require("jsonwebtoken");

const { getEnv } = require("./config");
const Prisma_Client = require("./Prisma");
const prisma = Prisma_Client.prismaClient;

const timeExpired = ({
  p_years = 0,
  p_months = 0,
  p_days = 0,
  p_hours = 0,
  p_minutes = 0,
  p_seconds = 60,
  time = now(),
}) => {
  const { years, months, days, hours, minutes, seconds } = timediff(
    time,
    now(),
    "YMDHmS"
  );

  return (
    years > p_years ||
    months > p_months ||
    days > p_days ||
    hours > p_hours ||
    minutes > p_minutes ||
    seconds > p_seconds
  );
};

const getError = (error) => {
  return {
    error,
    code: 404,
  };
};

const getSuccessData = (data) => {
  return {
    data,
    code: 200,
  };
};

const clean = (str) => {
  return str
    .replace(/[^\d.-]/g, "")
    .replace(/(?!\w|\s)./g, "")
    .replace(/\s+/g, "")
    .replace(/^(\s*)([\W\w]*)(\b\s*$)/g, "$2");
};

const createToken = async (user) => {
  const UNM = await prisma.userNotificationManagement.findFirst({
    where: {
      user_id: user.id,
    },
  });

  if (!UNM) {
    await prisma.userNotificationManagement.create({
      data: {
        user_id: user.id,
        new_follower: true,
        new_giveaway: true,
        post_like: true,
        post_comment_and_reply: true,
      },
    });
  }

  return jwt.sign(
    {
      _id: user.id,
      name: user.name,
      user_name: user.user_name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      dob: user.dob,
      gender: user.gender,
      rank: user.rank,
      picture_url: user.picture_url,
      bottom_bar_picture_url: user.bottom_bar_picture_url,
      is_public: user.is_public,
      show_give_aways_amount: user.show_give_aways_amount,
      new_follower_notification: UNM?.new_follower ?? true,
      new_giveaway_notification: UNM?.new_giveaway ?? true,
      post_like_notification: UNM?.post_like ?? true,
      post_comment_and_reply_notification: UNM?.post_comment_and_reply ?? true,
    },
    getEnv("JWT_SECERET")
  );
};

const ERROR_CODES = {
  bank_add: 2265233,
  twitter_add: 8948837233,
};

module.exports = {
  getError,
  getSuccessData,
  timeExpired,
  clean,
  createToken,
  ERROR_CODES,
};
