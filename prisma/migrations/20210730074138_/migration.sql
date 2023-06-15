/*
  Warnings:

  - Made the column `account_bank` on table `UserBankAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `account_number` on table `UserBankAccount` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserBankAccount" ALTER COLUMN "account_bank" SET NOT NULL,
ALTER COLUMN "account_number" SET NOT NULL;
