const router = require("express").Router();
const bcrypt = require("bcryptjs");
const rn = require("random-number");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");

const {
  ForgotPasswordValidation,
  OtpVerifyForgotPasswordValidation,
  ResetForgotPasswordValidation,
} = require("./validate");
const { getError, getSuccessData, timeExpired, clean } = require("../helpers");
const { send_message } = require("../twilio");
const Mailer = require("../Mailer");

//

router.post("/forgot_password", trimRequest.all, async (req, res) => {
  const { error, value } = ForgotPasswordValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { phone: _phone, email: _email } = value;
  const email = !_email ? _email : _email.toLowerCase();
  try {
    const random = rn.generator({
      min: 1111,
      max: 9999,
      integer: true,
    })();

    if (_phone) {
      const phone = "+" + clean(_phone);

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
      if (!PhoneExists)
        return res.status(404).send(getError("This number is not registered."));

      const existingOtp = await prisma.resetPassword.findFirst({
        where: {
          user_identifier: phone,
        },
      });

      await send_message({
        body: `Dear user, Your otp is ${random}, which is valid only for 5 minutes.`,
        number: phone,
      });

      if (existingOtp) {
        await prisma.resetPassword.update({
          where: {
            id: existingOtp.id,
          },
          data: {
            otp: random,
            is_verified: false,
          },
        });
      } else {
        await prisma.resetPassword.create({
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
    } else {
      const emailExists = await prisma.users.findFirst({
        where: {
          email,
          is_registered: true,
        },
      });
      if (!emailExists)
        return res.status(404).send(getError("Email is not registered."));

      const existingOtp = await prisma.resetPassword.findFirst({
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
        await prisma.resetPassword.update({
          where: {
            id: existingOtp.id,
          },
          data: {
            otp: random,
            is_verified: false,
          },
        });
      } else {
        await prisma.resetPassword.create({
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
    }
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/verify_reset_password_otp", trimRequest.all, async (req, res) => {
  const { error, value } = OtpVerifyForgotPasswordValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { phone: _phone, email: _email, otp } = value;
  const email = !_email ? _email : _email.toLowerCase();

  let user_identifier = null;
  let user_identifier_name = "";
  try {
    if (_phone) {
      const phone = "+" + clean(_phone);

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

      user_identifier = phone;
      user_identifier_name = "Phone";
      const PhoneExists = await prisma.users.findFirst({
        where: {
          phone: user_identifier,
          is_registered: true,
        },
      });
      if (!PhoneExists)
        return res.status(404).send(getError("Phone is not registered."));
    } else {
      user_identifier_name = "email";
      user_identifier = email;

      const EmailExists = await prisma.users.findFirst({
        where: {
          email: user_identifier,
          is_registered: true,
        },
      });
      if (!EmailExists)
        return res.status(404).send(getError("Email is not registered."));
    }

    const existingOtp = await prisma.resetPassword.findFirst({
      where: {
        user_identifier,
        is_verified: false,
      },
    });

    if (!existingOtp)
      return res
        .status(404)
        .send(getError(`sorry no otp issued to this ${user_identifier_name}.`));

    if (timeExpired({ time: existingOtp.updated_at, p_minutes: 5 })) {
      await prisma.resetPassword.delete({
        where: {
          id: existingOtp.id,
        },
      });
      return res.status(404).send(getError("Otp expired."));
    }

    if (existingOtp.otp != otp)
      return res.status(404).send(getError("Otp does not match."));

    await prisma.resetPassword.update({
      where: {
        id: existingOtp.id,
      },
      data: {
        is_verified: true,
      },
    });

    return res
      .status(200)
      .send(getSuccessData(`${user_identifier_name} successfully verified`));
  } catch (err) {
    return res.status(404).send(getError(err));
  }
});

router.post("/reset_password", trimRequest.all, async (req, res) => {
  const { error, value } = ResetForgotPasswordValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { phone: _phone, email: _email, password } = value;
  const email = !_email ? _email : _email.toLowerCase();

  let user_identifier = null;
  let user_identifier_name = "";
  try {
    if (_phone) {
      const phone = "+" + clean(_phone);

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

      user_identifier = phone;
      user_identifier_name = "Phone";
      const PhoneExists = await prisma.users.findFirst({
        where: {
          phone: user_identifier,
          is_registered: true,
        },
      });
      if (!PhoneExists)
        return res.status(404).send(getError("Phone is not registered."));
    } else {
      user_identifier_name = "email";
      user_identifier = email;

      const EmailExists = await prisma.users.findFirst({
        where: {
          email: user_identifier,
          is_registered: true,
        },
      });
      if (!EmailExists)
        return res.status(404).send(getError("Email is not registered."));
    }

    const existingOtp = await prisma.resetPassword.findFirst({
      where: {
        user_identifier,
        is_verified: true,
      },
    });

    if (!existingOtp)
      return res
        .status(404)
        .send(
          getError(
            `Please verify your ${user_identifier_name} then reset your password`
          )
        );

    const hashPassword = bcrypt.hashSync(password, 10);

    if (email) {
      const userEmail_ = await prisma.users.findFirst({
        where: {
          email: user_identifier,
          is_registered: true,
        },
      });
      if (!userEmail_)
        return res.status(404).send(getError("User do not exist"));
      await prisma.users.update({
        where: {
          id: userEmail_.id,
        },
        data: { password: hashPassword },
      });
    } else {
      const userPhone_ = await prisma.users.findFirst({
        where: {
          phone: user_identifier,
          is_registered: true,
        },
      });
      if (!userPhone_)
        return res.status(404).send(getError("User do not exist"));
      await prisma.users.update({
        where: {
          id: userPhone_.id,
        },
        data: { password: hashPassword },
      });
    }

    await prisma.resetPassword.delete({
      where: {
        id: existingOtp.id,
      },
    });

    return res.send(getSuccessData("Password Reset Successfully"));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

module.exports = router;
