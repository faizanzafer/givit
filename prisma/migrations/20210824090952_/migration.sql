/*
  Warnings:

  - The values [POST_LOKE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('NEW_FOLLOWER', 'NEW_FOLLOWER_REQUEST', 'NEW_GIVEAWAY', 'POST_LIKE', 'POST_COMMENT', 'POST_COMMENT_REPLY', 'WON_GIVEAWAY', 'WON_MONEY_TRANSFER', 'RANK_CHANGE', 'WINNER_FEEDBACK');
ALTER TABLE "UserNotifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;
