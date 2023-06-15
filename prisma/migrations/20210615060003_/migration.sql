/*
  Warnings:

  - You are about to drop the column `follower_status` on the `FollowRequests` table. All the data in the column will be lost.
  - You are about to drop the column `following_status` on the `FollowRequests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FollowRequests" DROP COLUMN "follower_status",
DROP COLUMN "following_status",
ADD COLUMN     "status" "FollowingApproval" NOT NULL DEFAULT E'PENDING';
