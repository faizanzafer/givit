-- CreateTable
CREATE TABLE "BlockedUsers" (
    "id" TEXT NOT NULL,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BlockedUsers" ADD FOREIGN KEY ("blocker_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedUsers" ADD FOREIGN KEY ("blocked_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
