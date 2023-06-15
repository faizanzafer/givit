-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'MEDIA');

-- CreateTable
CREATE TABLE "UserChannel" (
    "id" TEXT NOT NULL,
    "from_id" BIGINT NOT NULL,
    "to_id" BIGINT NOT NULL,
    "delete_conversation_for_from_id" BOOLEAN DEFAULT false,
    "delete_conversation_for_to_id" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMessages" (
    "id" TEXT NOT NULL,
    "from_id" BIGINT NOT NULL,
    "to_id" BIGINT NOT NULL,
    "users_channels_id" TEXT NOT NULL,
    "message_body" TEXT NOT NULL,
    "seen" BOOLEAN DEFAULT false,
    "message_type" "MessageType" NOT NULL DEFAULT E'TEXT',
    "attachments" TEXT,
    "message_time" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserChannel" ADD FOREIGN KEY ("from_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannel" ADD FOREIGN KEY ("to_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("from_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("to_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMessages" ADD FOREIGN KEY ("users_channels_id") REFERENCES "UserChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
