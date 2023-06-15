-- CreateEnum
CREATE TYPE "UserRanks" AS ENUM ('GOLD', 'SILVER', 'BRONZE');

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "rank" "UserRanks";
