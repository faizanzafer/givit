-- CreateTable
CREATE TABLE "UserBankAccount" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBankAccount_user_id_unique" ON "UserBankAccount"("user_id");

-- AddForeignKey
ALTER TABLE "UserBankAccount" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
