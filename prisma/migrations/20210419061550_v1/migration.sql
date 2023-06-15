-- CreateEnum
CREATE TYPE "GiveAwaysType" AS ENUM ('CASH', 'AIRTIME');

-- CreateEnum
CREATE TYPE "GiveAwaysStatus" AS ENUM ('ACTIVE', 'PAYMENTPENDING', 'ENDED');

-- CreateEnum
CREATE TYPE "GiveAwaysWinnerSelectionType" AS ENUM ('AUTOMATIC', 'MANUALLY');

-- CreateEnum
CREATE TYPE "FollowingApproval" AS ENUM ('PENDING', 'APPROVED');

-- CreateTable
CREATE TABLE "GiveAways" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" "GiveAwaysType" NOT NULL DEFAULT E'CASH',
    "amount_per_person" DOUBLE PRECISION NOT NULL,
    "total_winners" INTEGER NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "winner_selection_type" "GiveAwaysWinnerSelectionType" NOT NULL DEFAULT E'AUTOMATIC',
    "status" "GiveAwaysStatus" NOT NULL DEFAULT E'PAYMENTPENDING',
    "start_date_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date_time" TIMESTAMP(3) NOT NULL,
    "about" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowRequests" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "FollowingApproval" NOT NULL DEFAULT E'PENDING',
    "follower_id" BIGINT NOT NULL,
    "following_id" BIGINT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GiveAways" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequests" ADD FOREIGN KEY ("follower_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowRequests" ADD FOREIGN KEY ("following_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
