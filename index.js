const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

const bcrypt = require("bcryptjs");
const _ = require("lodash");
const { now } = require("mongoose");

const verifyToken = require("./middlewares/AuthMiddleware");
const Mailer = require("./Mailer");
const FlutterWave = require("./Flutterwave");
const Prisma_Client = require("./Prisma");
const Socket = require("./Socket");
const RunCron = require("./CronJob");

// importing Routes
const AuthRoutes = require("./routes/auth");
const SocialAuthRoutes = require("./routes/socialAuth");
const OptVerificationRoutes = require("./routes/OptVerification");
const ResetPasswordRoutes = require("./routes/ResetPassword");
const GiveAway = require("./routes/GiveAway");
const User = require("./routes/User");
const Explore = require("./routes/Explore");
const LikeDislike = require("./routes/LikeDislike");
const FollowUnfollow = require("./routes/FollowUnfollow");
const CommentsAndReplies = require("./routes/CommentsAndReplies");
const Chat = require("./routes/Chat");
const BlockUser = require("./routes/BlockUser");
const GiveAwaySubscibers = require("./routes/GiveAwaySubscibers");
const BanksAndTransfers = require("./routes/BanksAndTransfers");
const UserNotificationsManagement = require("./routes/UserNotificationsManagement");
const Miscellaneous = require("./routes/Miscellaneous");
const {
  getUserFollowers,
  isUserFollowingGiverOnTwitter,
} = require("./TwitterFunctions/Twitter");

app.use(express.json());
app.use(express.static(__dirname + "/public"));

Mailer.setupTransporter();
FlutterWave.setupFLltterWave();
Prisma_Client.setupPrisma();
Socket.setupSocket(server);

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server has started on port ${PORT}`);
  RunCron();
});

// Routes
app.use("/api", [
  OptVerificationRoutes,
  AuthRoutes,
  SocialAuthRoutes,
  ResetPasswordRoutes,
]);

app.use("/api/clear_db", async (req, res) => {
  const prisma = Prisma_Client.prismaClient;
  const resetPassword = prisma.resetPassword.deleteMany();
  const otpVerify = prisma.otpVerify.deleteMany();
  const giveAwayCommentRepliesLikes =
    prisma.giveAwayCommentRepliesLikes.deleteMany();
  const giveAwayCommentReplies = prisma.giveAwayCommentReplies.deleteMany();
  const giveAwayCommentLikes = prisma.giveAwayCommentLikes.deleteMany();
  const giveAwayComments = prisma.giveAwayComments.deleteMany();
  const giveAwayLikes = prisma.giveAwayLikes.deleteMany();
  const giveAwaysPendingPayment = prisma.giveAwaysPendingPayment.deleteMany();
  const giveAwaySubscibers = prisma.giveAwaySubscibers.deleteMany();
  const giveAways = prisma.giveAways.deleteMany();
  const channelMessages = prisma.channelMessages.deleteMany();
  const userChannel = prisma.userChannel.deleteMany();
  const followRequests = prisma.followRequests.deleteMany();
  const blockedUsers = prisma.blockedUsers.deleteMany();
  const userBankAccount = prisma.userBankAccount.deleteMany();
  const userNotificationManagement =
    prisma.userNotificationManagement.deleteMany();
  const userNotifications = prisma.userNotifications.deleteMany();
  const users = prisma.users.deleteMany();

  const hashPassword = bcrypt.hashSync("Abcd@1234", 10);

  const newUsers = prisma.users.createMany({
    data: [
      {
        name: "faizan zafar",
        user_name: "feziii_",
        email: `faizanzaferjut@gmail.com`,
        phone: "+923076500421",
        password: hashPassword,
        subscription_limit: 10,
        is_registered: true,
        updated_at: now(),
      },
      {
        name: "Mohsin Ali",
        user_name: "mohsin_ali",
        email: `ma823788@gmail.com`,
        phone: "+923074788476",
        password: hashPassword,
        subscription_limit: 10,
        is_registered: true,
        updated_at: now(),
      },
    ],
  });

  await prisma.$transaction([
    resetPassword,
    otpVerify,
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
    userNotificationManagement,
    userNotifications,
    users,
    newUsers,
  ]);

  return res.send({ message: "DB Cleared" });
});

// Anonomous Route
app.use("/api", [GiveAway]);

// Private Route
app.use("/api", verifyToken, [
  User,
  Explore,
  LikeDislike,
  FollowUnfollow,
  CommentsAndReplies,
  Chat,
  BlockUser,
  GiveAwaySubscibers,
  BanksAndTransfers,
  UserNotificationsManagement,
  Miscellaneous,
]);

app.use("/", async (req, res) => {
  return res.send({ response: "Givit server is up and running." }).status(200);
});
