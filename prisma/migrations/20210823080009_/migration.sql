/*
  Warnings:

  - A unique constraint covering the columns `[give_away_id]` on the table `GiveAwaysPendingPayment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "UserNotificationManagement" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "new_follower" BOOLEAN NOT NULL,
    "post_like" BOOLEAN NOT NULL,
    "post_comment_and_reply" BOOLEAN NOT NULL,
    "new_giveaway" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationManagement_user_id_unique" ON "UserNotificationManagement"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "GiveAwaysPendingPayment_give_away_id_unique" ON "GiveAwaysPendingPayment"("give_away_id");

-- AddForeignKey
ALTER TABLE "UserNotificationManagement" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
