-- AlterTable
ALTER TABLE "UserNotificationManagement" ALTER COLUMN "new_follower" SET DEFAULT true,
ALTER COLUMN "post_like" SET DEFAULT true,
ALTER COLUMN "post_comment_and_reply" SET DEFAULT true,
ALTER COLUMN "new_giveaway" SET DEFAULT true;
