/*
  Warnings:

  - You are about to drop the column `new_giveaway` on the `UserNotifications` table. All the data in the column will be lost.
  - You are about to drop the column `post_comment_and_reply` on the `UserNotifications` table. All the data in the column will be lost.
  - You are about to drop the column `post_like` on the `UserNotifications` table. All the data in the column will be lost.
  - Added the required column `notification` to the `UserNotifications` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `UserNotifications` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "UserNotifications" DROP COLUMN "new_giveaway",
DROP COLUMN "post_comment_and_reply",
DROP COLUMN "post_like",
ADD COLUMN     "notification" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL;
