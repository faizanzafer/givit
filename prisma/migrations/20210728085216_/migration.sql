-- AlterTable
ALTER TABLE "GiveAwaySubscibers" ADD COLUMN     "response" TEXT;

-- AlterTable
ALTER TABLE "GiveAways" ADD COLUMN     "is_response_required" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "subscription_limit" INTEGER DEFAULT 10;
