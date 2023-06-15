-- CreateTable
CREATE TABLE "GiveAwaysPendingPayment" (
    "id" BIGSERIAL NOT NULL,
    "flw_ref" VARCHAR(150) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "give_away_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GiveAwaysPendingPayment" ADD FOREIGN KEY ("give_away_id") REFERENCES "GiveAways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveAwaysPendingPayment" ADD FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
