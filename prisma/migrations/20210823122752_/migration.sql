-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_FOLLOWER', 'NEW_GIVEAWAY', 'POST_LOKE', 'POST_COMMENT', 'POST_COMMENT_REPLY', 'WON_GIVEAWAY', 'WON_MONEY_TRANSFER', 'RANK_CHANGE', 'WINNER_FEEDBACK');

-- CreateTable
CREATE TABLE "UserNotifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" BOOLEAN NOT NULL,
    "post_like" BOOLEAN NOT NULL,
    "post_comment_and_reply" BOOLEAN NOT NULL,
    "new_giveaway" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserNotifications" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
