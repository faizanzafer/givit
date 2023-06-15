-- AlterTable
ALTER TABLE "FollowRequests" ALTER COLUMN "follower_status" DROP NOT NULL,
ALTER COLUMN "follower_status" DROP DEFAULT,
ALTER COLUMN "following_status" DROP NOT NULL,
ALTER COLUMN "following_status" DROP DEFAULT;
