/*
  Warnings:

  - You are about to drop the column `social_auth_provider` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Users" DROP COLUMN "social_auth_provider";
