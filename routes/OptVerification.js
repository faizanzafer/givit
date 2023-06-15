const router = require("express").Router();
const rn = require("random-number");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");

const {
  emailValidation,
  phoneAndOtpValidation,
  phoneValidation,
  emailPhoneAndOtpValidation,
} = require("./validate");
const { getError, getSuccessData, clean, timeExpired } = require("../helpers");
const { send_message } = require("../twilio");
const Mailer = require("../Mailer");

//
router.post("/request_phone_otp", trimRequest.all, async (req, res) => {
  const { error, value } = phoneValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));
  const phone = "+" + clean(value.phone);
  // return res.send(value);

  try {
    if (phone.startsWith("+92")) {
      if (phone.length != 13)
        return res
          .status(404)
          .send(getError("Phone should be 10 character long."));
    } else if (phone.startsWith("+234")) {
      if (phone.length != 14)
        return res
          .status(404)
          .send(getError("Phone should be 10 or 11  character long."));
    } else
      return res
        .status(404)
        .send(getError("Phone can only starts with +92 or +234."));

    const PhoneExists = await prisma.users.findFirst({
      where: {
        phone,
        is_registered: true,
      },
    });
    if (PhoneExists)
      return res
        .status(404)
        .send(getError("This phone number is already registered"));

    const random = rn.generator({
      min: 1111,
      max: 9999,
      integer: true,
    })();

    const existingOtp = await prisma.otpVerify.findFirst({
      where: {
        user_identifier: phone,
      },
    });

    const messageSent = await send_message({
      body: `Dear user, Your otp is ${random}, which is valid only for 5 minutes.`,
      number: phone,
    });
    if (messageSent) {
      if (existingOtp) {
        await prisma.otpVerify.update({
          where: {
            id: existingOtp.id,
          },
          data: {
            otp: random,
          },
        });
      } else {
        await prisma.otpVerify.create({
          data: {
            user_identifier: phone,
            otp: random,
          },
        });
      }
      return res
        .status(200)
        .send(
          getSuccessData(
            "Otp sent to your phone, which is valid only for 5 minutes"
          )
        );
    }
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/verify_phone_otp", trimRequest.all, async (req, res) => {
  const { error, value } = phoneAndOtpValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { otp } = value;
  const phone = "+" + clean(value.phone);

  try {
    if (phone.startsWith("+92")) {
      if (phone.length != 13)
        return res
          .status(404)
          .send(getError("Phone should be 10 character long."));
    } else if (phone.startsWith("+234")) {
      if (phone.length != 14)
        return res
          .status(404)
          .send(getError("Phone should be 10 or 11  character long."));
    } else
      return res
        .status(404)
        .send(getError("Phone can only starts with +92 or +234."));

    const PhoneExists = await prisma.users.findFirst({
      where: {
        phone,
        is_registered: true,
      },
    });
    if (PhoneExists)
      return res
        .status(404)
        .send(getError("This phone number is already registered"));

    const existingOtp = await prisma.otpVerify.findFirst({
      where: {
        user_identifier: phone,
      },
    });

    if (!existingOtp)
      return res
        .status(404)
        .send(getError("sorry no otp issued to this phone."));

    if (timeExpired({ time: existingOtp.updated_at, p_minutes: 5 })) {
      await prisma.otpVerify.delete({
        where: {
          id: existingOtp.id,
        },
      });
      return res.status(404).send(getError("Otp Expired."));
    }

    // if (existingOtp.otp != otp)
    //   return res.status(404).send(getError("Otp does not match."));

    const existingUser = await prisma.users.findFirst({
      where: {
        phone,
      },
    });

    if (!existingUser) {
      await prisma.users.create({
        data: {
          phone,
        },
      });
    }
    if (existingUser && existingUser.is_registered == true)
      return res
        .status(404)
        .send(getError("This phone number is already registered"));

    await prisma.otpVerify.delete({
      where: {
        id: existingOtp.id,
      },
    });

    return res.status(200).send(getSuccessData("Phone successfully verified"));
  } catch (err) {
    return res.status(404).send(getError(err));
  }
});

router.post("/request_email_otp", trimRequest.all, async (req, res) => {
  const { error, value } = emailValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  try {
    const { email: _email } = value;
    const email = _email.toLowerCase();
    const emailExists = await prisma.users.findFirst({
      where: {
        email,
        is_registered: true,
      },
    });
    if (emailExists)
      return res.status(404).send(getError("Email already taken."));

    const random = rn.generator({
      min: 1111,
      max: 9999,
      integer: true,
    })();

    const existingOtp = await prisma.otpVerify.findFirst({
      where: {
        user_identifier: email,
      },
    });

    await Mailer.sendMail(
      email,
      "Otp Verification",
      `Dear User, Otp is ${random}, which is valid only for 5 minutes.`
    );

    if (existingOtp) {
      await prisma.otpVerify.update({
        where: {
          id: existingOtp.id,
        },
        data: {
          otp: random,
        },
      });
    } else {
      await prisma.otpVerify.create({
        data: {
          user_identifier: email,
          otp: random,
        },
      });
    }
    return res
      .status(200)
      .send(
        getSuccessData(
          "Otp sent to your email, which is valid only for 5 minutes"
        )
      );
  } catch (err) {
    return res.status(404).send(getError(err));
  }
});

router.post("/verify_email_otp", trimRequest.all, async (req, res) => {
  const { error, value } = emailPhoneAndOtpValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { email: _email, otp } = value;
  const email = _email.toLowerCase();
  const phone = "+" + clean(value.phone);

  try {
    if (phone.startsWith("+92")) {
      if (phone.length != 13)
        return res
          .status(404)
          .send(getError("Phone should be 10 character long."));
    } else if (phone.startsWith("+234")) {
      if (phone.length != 14)
        return res
          .status(404)
          .send(getError("Phone should be 10 or 11  character long."));
    } else
      return res
        .status(404)
        .send(getError("Phone can only starts with +92 or +234."));

    const emailExists = await prisma.users.findFirst({
      where: {
        email,
        is_registered: true,
      },
    });
    if (emailExists)
      return res.status(404).send(getError("Email already taken."));

    const phoneExists = await prisma.users.findFirst({
      where: {
        phone,
        is_registered: true,
      },
    });
    if (phoneExists)
      return res
        .status(404)
        .send(getError("This phone number is already registered"));

    const existingOtp = await prisma.otpVerify.findFirst({
      where: {
        user_identifier: email,
      },
    });

    if (!existingOtp)
      return res
        .status(404)
        .send(getError("sorry no otp issued to this Email."));

    if (timeExpired({ time: existingOtp.updated_at, p_minutes: 5 })) {
      await prisma.otpVerify.delete({
        where: {
          id: existingOtp.id,
        },
      });
      return res.status(404).send(getError("Otp Expired."));
    }

    if (existingOtp.otp != otp)
      return res.status(404).send(getError("Otp does not match."));

    const existingUser = await prisma.users.findFirst({
      where: {
        phone,
      },
    });

    if (!existingUser) {
      return res
        .status(404)
        .send(getError("First verify your phone, then verify email."));
    }

    if (existingUser.is_registered == true)
      return res.status(404).send(getError("Email already taken."));

    await prisma.users
      .update({
        where: { id: existingUser.id },
        data: {
          email,
        },
      })
      .then(async () => {
        await prisma.otpVerify.delete({
          where: {
            id: existingOtp.id,
          },
        });
      });

    return res.status(200).send(getSuccessData("Email successfully verified"));
  } catch (err) {
    return res.status(404).send(getError(err));
  }
});

module.exports = router;
