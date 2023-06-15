/*
  Warnings:

  - You are about to drop the column `message_time` on the `ChannelMessages` table. All the data in the column will be lost.
  - The primary key for the `FollowRequests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiveAwayCommentLikes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiveAwayCommentReplies` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiveAwayCommentRepliesLikes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiveAwayComments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiveAwayLikes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiveAways` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `GiveAwaysPendingPayment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `OtpVerify` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `ResetPassword` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Users` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "ChannelMessages" DROP CONSTRAINT "ChannelMessages_from_id_fkey";

-- DropForeignKey
ALTER TABLE "ChannelMessages" DROP CONSTRAINT "ChannelMessages_to_id_fkey";

-- DropForeignKey
ALTER TABLE "FollowRequests" DROP CONSTRAINT "FollowRequests_follower_id_fkey";

-- DropForeignKey
ALTER TABLE "FollowRequests" DROP CONSTRAINT "FollowRequests_following_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentLikes" DROP CONSTRAINT "GiveAwayCommentLikes_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentLikes" DROP CONSTRAINT "GiveAwayCommentLikes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentReplies" DROP CONSTRAINT "GiveAwayCommentReplies_comment_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentReplies" DROP CONSTRAINT "GiveAwayCommentReplies_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" DROP CONSTRAINT "GiveAwayCommentRepliesLikes_reply_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" DROP CONSTRAINT "GiveAwayCommentRepliesLikes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayComments" DROP CONSTRAINT "GiveAwayComments_give_away_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayComments" DROP CONSTRAINT "GiveAwayComments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayLikes" DROP CONSTRAINT "GiveAwayLikes_give_away_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwayLikes" DROP CONSTRAINT "GiveAwayLikes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAways" DROP CONSTRAINT "GiveAways_user_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwaysPendingPayment" DROP CONSTRAINT "GiveAwaysPendingPayment_give_away_id_fkey";

-- DropForeignKey
ALTER TABLE "GiveAwaysPendingPayment" DROP CONSTRAINT "GiveAwaysPendingPayment_user_id_fkey";

-- DropForeignKey
ALTER TABLE "UserChannel" DROP CONSTRAINT "UserChannel_from_id_fkey";

-- DropForeignKey
ALTER TABLE "UserChannel" DROP CONSTRAINT "UserChannel_to_id_fkey";

-- AlterTable
ALTER TABLE "ChannelMessages" DROP COLUMN "message_time",
ALTER COLUMN "from_id" SET DATA TYPE TEXT,
ALTER COLUMN "to_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "FollowRequests" DROP CONSTRAINT "FollowRequests_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "follower_id" SET DATA TYPE TEXT,
ALTER COLUMN "following_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "FollowRequests_id_seq";

-- AlterTable
ALTER TABLE "GiveAwayCommentLikes" DROP CONSTRAINT "GiveAwayCommentLikes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "comment_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "GiveAwayCommentLikes_id_seq";

-- AlterTable
ALTER TABLE "GiveAwayCommentReplies" DROP CONSTRAINT "GiveAwayCommentReplies_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "comment_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "GiveAwayCommentReplies_id_seq";

-- AlterTable
ALTER TABLE "GiveAwayCommentRepliesLikes" DROP CONSTRAINT "GiveAwayCommentRepliesLikes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "reply_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "GiveAwayCommentRepliesLikes_id_seq";

-- AlterTable
ALTER TABLE "GiveAwayComments" DROP CONSTRAINT "GiveAwayComments_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "give_away_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "GiveAwayComments_id_seq";

-- AlterTable
ALTER TABLE "GiveAwayLikes" DROP CONSTRAINT "GiveAwayLikes_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "give_away_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "GiveAwayLikes_id_seq";

-- AlterTable
ALTER TABLE "GiveAways" DROP CONSTRAINT "GiveAways_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "GiveAways_id_seq";

-- AlterTable
ALTER TABLE "GiveAwaysPendingPayment" DROP CONSTRAINT "GiveAwaysPendingPayment_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ALTER COLUMN "give_away_id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "GiveAwaysPendingPayment_id_seq";

-- AlterTable
ALTER TABLE "OtpVerify" DROP CONSTRAINT "OtpVerify_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "OtpVerify_id_seq";

-- AlterTable
ALTER TABLE "ResetPassword" DROP CONSTRAINT "ResetPassword_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "ResetPassword_id_seq";

-- AlterTable
ALTER TABLE "UserChannel" ALTER COLUMN "from_id" SET DATA TYPE TEXT,
ALTER COLUMN "to_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Users" DROP CONSTRAINT "Users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD PRIMARY KEY ("id");
DROP SEQUENCE "Users_id_seq";

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("to_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("from_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequests" ADD FOREIGN KEY ("follower_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequests" ADD FOREIGN KEY ("following_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentLikes" ADD FOREIGN KEY ("comment_id") REFERENCES "GiveAwayComments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentLikes" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentReplies" ADD FOREIGN KEY ("comment_id") REFERENCES "GiveAwayComments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentReplies" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" ADD FOREIGN KEY ("reply_id") REFERENCES "GiveAwayCommentReplies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayCommentRepliesLikes" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayComments" ADD FOREIGN KEY ("give_away_id") REFERENCES "GiveAways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayComments" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayLikes" ADD FOREIGN KEY ("give_away_id") REFERENCES "GiveAways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwayLikes" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAways" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwaysPendingPayment" ADD FOREIGN KEY ("give_away_id") REFERENCES "GiveAways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwaysPendingPayment" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannel" ADD FOREIGN KEY ("to_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannel" ADD FOREIGN KEY ("from_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
