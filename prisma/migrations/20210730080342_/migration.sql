/*
  Warnings:

  - Made the column `bank_name` on table `UserBankAccount` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserBankAccount" ALTER COLUMN "bank_name" SET NOT NULL;
