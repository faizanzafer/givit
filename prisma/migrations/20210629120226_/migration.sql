-- AlterTable
ALTER TABLE "GiveAways" ADD COLUMN     "payment_confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;