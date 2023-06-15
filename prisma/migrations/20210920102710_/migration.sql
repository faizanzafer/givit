/*
  Warnings:

  - Made the column `is_registered` on table `Users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_public` on table `Users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `Users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `Users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `login_attempts` on table `Users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `show_give_aways_amount` on table `Users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Users" ALTER COLUMN "is_registered" SET NOT NULL,
ALTER COLUMN "is_public" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "login_attempts" SET NOT NULL,
ALTER COLUMN "show_give_aways_amount" SET NOT NULL;
