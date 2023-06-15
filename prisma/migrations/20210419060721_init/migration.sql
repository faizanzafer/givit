-- CreateTable
CREATE TABLE "Users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(150),
    "email" VARCHAR(150),
    "phone" VARCHAR(150) NOT NULL,
    "password" VARCHAR(150),
    "social_auth_provider" VARCHAR(150) NOT NULL DEFAULT E'no',
    "social_auth_provider_user_id" VARCHAR(150),
    "is_registered" BOOLEAN DEFAULT false,
    "is_public" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpVerify" (
    "id" BIGSERIAL NOT NULL,
    "user_identifier" VARCHAR(150) NOT NULL,
    "otp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResetPassword" (
    "id" BIGSERIAL NOT NULL,
    "user_identifier" VARCHAR(150) NOT NULL,
    "otp" INTEGER NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);
