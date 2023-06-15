-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "login_attempts" INTEGER DEFAULT 0,
ADD COLUMN     "locked" BOOLEAN DEFAULT false,
ADD COLUMN     "locked_at" TIMESTAMP(3);
