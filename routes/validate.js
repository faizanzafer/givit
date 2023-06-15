const { MessageType, GiveAwaysWinnerSelectionType } = require(".prisma/client");
const Joi = require("joi");

function registerValidation(data) {
  const registerSchema = Joi.object({
    name: Joi.string().max(50).required(),
    user_name: Joi.string().max(15).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    password: Joi.string().required(),
    is_social_login: Joi.boolean().required(),
    social_auth_id: Joi.when("is_social_login", {
      is: true,
      then: Joi.string().required(),
    }),
    referer: Joi.any(),
  });

  return registerSchema.validate(data);
}

function loginValidation(data) {
  const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });
  return loginSchema.validate(data);
}

function emailValidation(data) {
  const emailSchema = Joi.object({
    email: Joi.string().email().required(),
  });
  return emailSchema.validate(data);
}

function userNamelValidation(data) {
  const userNameSchema = Joi.object({
    user_name: Joi.string().required(),
  });
  return userNameSchema.validate(data);
}

function refererCodeValidation(data) {
  const refererCodeSchema = Joi.object({
    referer_code: Joi.string().required(),
  });
  return refererCodeSchema.validate(data);
}

function phoneAndOtpValidation(data) {
  const phoneAndOtpSchema = Joi.object({
    phone: Joi.string().required(),
    otp: Joi.number().integer().greater(1111).less(9999).required().messages({
      "number.greater": "otp must be 4 digit number.",
      "number.less": "otp must be 4 digit number.",
    }),
  });
  return phoneAndOtpSchema.validate(data);
}

function phoneValidation(data) {
  const phoneSchema = Joi.object({
    phone: Joi.string().required(),
  });
  return phoneSchema.validate(data);
}

function emailPhoneAndOtpValidation(data) {
  const phoneEmailAndOtpSchema = Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    otp: Joi.number().integer().greater(1111).less(9999).required().messages({
      "number.greater": "otp must be 4 digit number.",
      "number.less": "otp must be 4 digit number.",
    }),
  });
  return phoneEmailAndOtpSchema.validate(data);
}

function socialAuthValidation(data) {
  const SocialAuthSchema = Joi.object({
    social_auth_id: Joi.required(),
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    user_name: Joi.string().required(),
    phone: Joi.string().required(),
  });
  return SocialAuthSchema.validate(data);
}

function ForgotPasswordValidation(data) {
  const ResetPasswordSchema = Joi.object({
    email: Joi.string().email(),
    phone: Joi.string(),
  }).xor("email", "phone");
  return ResetPasswordSchema.validate(data);
}

function OtpVerifyForgotPasswordValidation(data) {
  const OtpVerifyForgotPasswordSchema = Joi.object({
    email: Joi.string().email(),
    phone: Joi.string(),
    otp: Joi.number().integer().greater(1111).less(9999).required().messages({
      "number.greater": "otp must be 4 digit number.",
      "number.less": "otp must be 4 digit number.",
    }),
  }).xor("email", "phone");
  return OtpVerifyForgotPasswordSchema.validate(data);
}

function ResetForgotPasswordValidation(data) {
  const ResetForgotPasswordSchema = Joi.object({
    email: Joi.string().email(),
    phone: Joi.string(),
    password: Joi.string().required(),
  }).xor("email", "phone");
  return ResetForgotPasswordSchema.validate(data);
}

function giveAwayValidation(data) {
  const __ = new Date();
  __.setHours(0, 0, 0, 0);

  const giveAwaySchema = Joi.object({
    amount_per_person: Joi.number().greater(0).required(),
    total_winners: Joi.number().integer().greater(0).required(),
    winner_selection_type: Joi.string()
      .valid(
        GiveAwaysWinnerSelectionType.AUTOMATIC,
        GiveAwaysWinnerSelectionType.MANUALLY
      )
      .required(),
    end_time: Joi.string()
      .regex(/^([0-9]{2})\:([0]{2})$/)
      .required()
      .messages({
        "string.pattern.base": "Must have a complete hour format 00:00.",
      }),
    end_date: Joi.date().min(__).required(),
    about: Joi.string().required(),
    card_number: Joi.number().integer().required(),
    name_on_card: Joi.string().required(),
    expiry_month: Joi.number().integer().required(),
    expiry_year: Joi.number().integer().required(),
    cvv: Joi.number().integer().required(),
    card_pin: Joi.number().integer().required(),
    is_response_required: Joi.boolean().required(),
    twitter_restriction: Joi.boolean().required(),
  });
  return giveAwaySchema.validate(data);
}

function giveAwayPaymentVerificationValidation(data) {
  const giveAwayPaymentVerificationSchema = Joi.object({
    otp: Joi.number().integer().required(),
    give_away_id: Joi.string().required(),
  });
  return giveAwayPaymentVerificationSchema.validate(data);
}

function userProfileValidation(data) {
  const userProfileSchema = Joi.object({
    user_id: Joi.string().required(),
  });
  return userProfileSchema.validate(data);
}

function updateProfileValidation(data) {
  const userProfileSchema = Joi.object({
    name: Joi.string().max(50),
    phone: Joi.string(),
    bio: Joi.string().allow(null, "").max(250),
    gender: Joi.string().valid("Male", "Female", "Other"),
    dob: Joi.string(),
  });
  return userProfileSchema.validate(data);
}

function updateSocialProfileValidation(data) {
  const updateSocialProfileSchema = Joi.object({
    twitter_profile: Joi.when("instagram_profile", {
      is: Joi.exist(),
      then: Joi.object({
        id: Joi.string().required(),
        user_name: Joi.string().max(15).required(),
      }),
      otherwise: Joi.object({
        id: Joi.string().required(),
        user_name: Joi.string().max(15).required(),
      }).required(),
    }),
    instagram_profile: Joi.object({
      id: Joi.string().required(),
      user_name: Joi.string().max(15).required(),
    }),
  });
  return updateSocialProfileSchema.validate(data);
}

function removeSocialProfileValidation(data) {
  const updateSocialProfileSchema = Joi.object({
    twitter_profile: Joi.when("instagram_profile", {
      is: Joi.exist(),
      then: Joi.boolean().valid(true),
      otherwise: Joi.boolean().valid(true).required(),
    }),
    instagram_profile: Joi.boolean().valid(true),
  });
  return updateSocialProfileSchema.validate(data);
}

function postValidation(data) {
  const postSchema = Joi.object({
    post_id: Joi.string().required(),
  });
  return postSchema.validate(data);
}

function postWinnerSelectionValidation(data) {
  const postWinnerSelectionSchema = Joi.object({
    post_id: Joi.string().required(),
    user_ids: Joi.array().items(Joi.string().required()).min(1).required(),
  });
  return postWinnerSelectionSchema.validate(data);
}

function postFeedbackValidation(data) {
  const postFeedbackSchema = Joi.object({
    post_id: Joi.string().required(),
    feed_back: Joi.string().max(150).required(),
  });
  return postFeedbackSchema.validate(data);
}

function postSubscribeValidation(data) {
  const postSchema = Joi.object({
    post_id: Joi.string().required(),
    response: Joi.string().max(250),
  });
  return postSchema.validate(data);
}

function postCommentValidation(data) {
  const postCommentSchema = Joi.object({
    post_id: Joi.string().required(),
    comment: Joi.string().required(),
  });
  return postCommentSchema.validate(data);
}

function postCommentRepliesValidation(data) {
  const postCommentRepliesSchema = Joi.object({
    post_id: Joi.string().required(),
    comment_id: Joi.string().required(),
    reply: Joi.string().required(),
  });
  return postCommentRepliesSchema.validate(data);
}

function postCommentLikesValidation(data) {
  const postCommentLikesSchema = Joi.object({
    post_id: Joi.string().required(),
    comment_id: Joi.string().required(),
  });
  return postCommentLikesSchema.validate(data);
}

function postCommentReplyLikesValidation(data) {
  const postCommentReplyLikesSchema = Joi.object({
    post_id: Joi.string().required(),
    comment_id: Joi.string().required(),
    reply_id: Joi.string().required(),
  });
  return postCommentReplyLikesSchema.validate(data);
}

function messageValidation(data) {
  const messageSchema = Joi.object({
    to_id: Joi.string().required(),
    message_type: Joi.string()
      .valid(MessageType.TEXT.toString(), MessageType.MEDIA.toString())
      .required(),
    attachment: Joi.when("message_type", {
      is: MessageType.MEDIA.toString(),
      then: Joi.string().required(),
    }),
    media_type: Joi.when("message_type", {
      is: MessageType.MEDIA.toString(),
      then: Joi.string().required(),
    }),
    message_body: Joi.when("message_type", {
      is: MessageType.TEXT.toString(),
      then: Joi.string().required(),
      otherwise: Joi.string(),
    }),
    uuid: Joi.any().required(),
  });
  return messageSchema.validate(data);
}

function fetchMessageValidation(data) {
  const fetchMessageSchema = Joi.object({
    to_id: Joi.string().required(),
    page: Joi.number().integer(),
  });
  return fetchMessageSchema.validate(data);
}

function deleteMessagesValidation(data) {
  const deleteMessagesSchema = Joi.object({
    to_id: Joi.string().required(),
    message_ids: Joi.string().required(),
  });
  return deleteMessagesSchema.validate(data);
}

function bankAccountValidation(data) {
  const bankAccountSchema = Joi.object({
    account_bank: Joi.string().required(),
    account_number: Joi.string().required(),
    bank_name: Joi.string().required(),
  });
  return bankAccountSchema.validate(data);
}

function contactsValidation(data) {
  const contactsSchema = Joi.object({
    contacts: Joi.array().items(Joi.string().required()).min(1).required(),
  });
  return contactsSchema.validate(data);
}

function FCMValidation(data) {
  const FCMSchema = Joi.object({
    fcm_token: Joi.string().required(),
  });
  return FCMSchema.validate(data);
}

module.exports = {
  registerValidation,
  loginValidation,
  emailValidation,
  userNamelValidation,
  refererCodeValidation,
  phoneAndOtpValidation,
  phoneValidation,
  emailPhoneAndOtpValidation,
  socialAuthValidation,
  ForgotPasswordValidation,
  OtpVerifyForgotPasswordValidation,
  ResetForgotPasswordValidation,
  giveAwayValidation,
  giveAwayPaymentVerificationValidation,
  userProfileValidation,
  updateProfileValidation,
  updateSocialProfileValidation,
  removeSocialProfileValidation,
  postValidation,
  postWinnerSelectionValidation,
  postFeedbackValidation,
  postSubscribeValidation,
  postCommentValidation,
  postCommentRepliesValidation,
  postCommentLikesValidation,
  postCommentReplyLikesValidation,
  messageValidation,
  fetchMessageValidation,
  deleteMessagesValidation,
  bankAccountValidation,
  contactsValidation,
  FCMValidation,
};
