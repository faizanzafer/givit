/*
  Warnings:

  - You are about to drop the column `status` on the `FollowRequests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FollowRequests" DROP COLUMN "status",
ADD COLUMN     "follower_status" "FollowingApproval" NOT NULL DEFAULT E'PENDING',
ADD COLUMN     "following_status" "FollowingApproval" NOT NULL DEFAULT E'PENDING';
