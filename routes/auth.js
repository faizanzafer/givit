const router = require("express").Router();
const bcrypt = require("bcryptjs");
const trimRequest = require("trim-request");
const fs = require("fs");
const sharp = require("sharp");

const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

const ImageUploader = require("../middlewares/ImageMulter");
const {
  registerValidation,
  loginValidation,
  emailValidation,
  userNamelValidation,
  refererCodeValidation,
} = require("./validate");
const { getEnv } = require("../config");
const {
  getError,
  getSuccessData,
  clean,
  timeExpired,
  createToken,
} = require("../helpers");
const {
  getExistingUserFromEmail,
  checkUserNameTaken,
  createUser,
  checkEmailAndPhoneExist,
  getUserFromPhone,
  getUserfromEmail,
} = require("../database_queries/Auth");

const SUBSCRIPTION_LIMIT = 10;
//
//
//
//

router.post(
  "/register",
  [ImageUploader, trimRequest.body],
  async (req, res) => {
    try {
      if (req.file_error) {
        console.log(req.file_error);
        deleteUploadedImage(req);
        return res.status(404).send(getError(req.file_error));
      }

      const { error, value } = registerValidation(req.body);
      if (error) {
        deleteUploadedImage(req);
        return res.status(404).send(getError(error.details[0].message));
      }

      const {
        name,
        user_name,
        email: _email,
        phone: _phone,
        password,
        social_auth_id,
      } = value;

      const { referer: _referer } = req.body;

      const email = _email.toLowerCase();
      const referer = _referer ? _referer.toLowerCase() : _referer;
      const phone = "+" + clean(_phone);

      if (phone.startsWith("+92")) {
        if (phone.length != 13) {
          deleteUploadedImage(req);
          return res
            .status(404)
            .send(getError("Phone should be 10 character long."));
        }
      } else if (phone.startsWith("+234")) {
        if (phone.length != 14) {
          deleteUploadedImage(req);
          return res
            .status(404)
            .send(getError("Phone should be 10 or 11 character long."));
        }
      } else {
        deleteUploadedImage(req);
        return res
          .status(404)
          .send(getError("Phone can only starts with +92 or +234"));
      }
      const emailExists = await getUserfromEmail(email);
      if (!emailExists) {
        deleteUploadedImage(req);
        return res
          .status(404)
          .send(getError("First verify your email then continue."));
      }
      if (emailExists.is_registered == true) {
        deleteUploadedImage(req);
        return res.status(404).send(getError("Email already taken."));
      }
      const phoneExists = await getUserFromPhone(phone);
      if (!phoneExists) {
        deleteUploadedImage(req);
        return res
          .status(404)
          .send(getError("First verify your phone then continue."));
      }
      if (phoneExists.is_registered == true) {
        deleteUploadedImage(req);
        return res
          .status(404)
          .send(getError("This phone number is already registered"));
      }
      const userNameExists = await checkUserNameTaken(user_name);
      if (userNameExists) {
        deleteUploadedImage(req);
        return res.status(404).send(getError("User name already taken."));
      }
      const hashPassword = bcrypt.hashSync(password, 10);

      const user = await checkEmailAndPhoneExist(email, phone);

      if (!user) {
        deleteUploadedImage(req);
        return res
          .status(404)
          .send(getError("This email and phone is already taken."));
      }
      let sub_limit = SUBSCRIPTION_LIMIT;

      if (req.file?.path) {
        await makeCircleAvater(req);
      }

      const avatarImage = req.file?.path
        ? `${req.file.destination}/bottom_bar_${req.file.filename}`
        : null;

      if (referer && typeof referer == "string" && referer.length > 0) {
        const refrerUser = await prisma.users.findFirst({
          where: {
            user_name: referer,
            is_registered: true,
          },
        });

        if (!refrerUser) {
          deleteUploadedImage(req);
          return res.status(404).send(getError("This refrer does not exist."));
        }

        sub_limit++;

        const newUser = await createUser(
          user,
          user_name,
          name,
          req.file?.path
            ? `${getEnv("APP_URL")}${req.file.path.split("public")[1]}`
            : null,
          req.file?.path
            ? `${getEnv("APP_URL")}${avatarImage.split("public")[1]}`
            : null,
          hashPassword,
          sub_limit,
          social_auth_id
        );

        await prisma.users.update({
          where: {
            id: refrerUser.id,
          },
          data: {
            subscription_limit: ++refrerUser.subscription_limit,
          },
        });

        return res.send(getSuccessData(await createToken(newUser)));
      }

      const newUser = await createUser(
        user,
        user_name,
        name,
        req.file?.path
          ? `${getEnv("APP_URL")}${req.file.path.split("public")[1]}`
          : null,
        req.file?.path
          ? `${getEnv("APP_URL")}${avatarImage.split("public")[1]}`
          : null,
        hashPassword,
        sub_limit,
        social_auth_id
      );

      return res.send(getSuccessData(await createToken(newUser)));
    } catch (catchError) {
      deleteUploadedImage(req);
      if (catchError && catchError.message) {
        return res.status(404).send(getError(catchError.message));
      }
      return res.status(404).send(getError(catchError));
    }
  }
);

router.post("/login", trimRequest.all, async (req, res) => {
  const { error, value } = loginValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { email: _email, password } = value;
  const email = _email.toLowerCase();
  try {
    const emailExists = await getExistingUserFromEmail(email);
    if (!emailExists)
      return res
        .status(404)
        .send(getError("User with this email does not exist."));

    if (emailExists.login_attempts >= 3)
      if (emailExists.locked_at) {
        if (!timeExpired({ time: emailExists.locked_at, p_minutes: 1 }))
          return res
            .status(404)
            .send(
              getError("You are locked for 1 minute. So try after 1 minute.")
            );

        if (timeExpired({ time: emailExists.locked_at, p_minutes: 10 }))
          await prisma.users.update({
            where: { id: emailExists.id },
            data: {
              locked_at: null,
              login_attempts: 0,
            },
          });
      }

    const isValidPassword = bcrypt.compareSync(password, emailExists.password);
    if (!isValidPassword) {
      if (emailExists.login_attempts >= 3) {
        await prisma.users.update({
          where: { id: emailExists.id },
          data: {
            locked_at: new Date(),
            login_attempts: emailExists.login_attempts + 1,
          },
        });
        return res
          .status(404)
          .send(
            getError("You are locked for 1 minute. So try after 1 minute.")
          );
      } else {
        await prisma.users.update({
          where: { id: emailExists.id },
          data: {
            login_attempts: emailExists.login_attempts + 1,
          },
        });
      }
      return res.status(404).send(getError("Password is not valid."));
    }

    await prisma.users.update({
      where: { id: emailExists.id },
      data: {
        locked_at: null,
        login_attempts: 0,
      },
    });

    const user = emailExists;

    return res.send(getSuccessData(await createToken(user)));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/check_email", trimRequest.body, async (req, res) => {
  const { error, value } = emailValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  try {
    const { email: _email } = value;
    const email = _email.toLowerCase();
    const emailExists = await getExistingUserFromEmail(email);
    if (emailExists && emailExists.social_auth_provider_user_id != null)
      return res
        .status(404)
        .send(getError({ message: "Email is already registered.", email }));
    else if (emailExists && emailExists.social_auth_provider_user_id == null)
      return res
        .status(404)
        .send(getError({ message: "Email is already registered.", email }));

    return res.send(
      getSuccessData({ message: "You can use this email", email })
    );
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/check_user_name", trimRequest.all, async (req, res) => {
  const { error, value } = userNamelValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { user_name } = value;
  try {
    const userNameExists = await checkUserNameTaken(user_name);
    if (userNameExists)
      return res
        .status(404)
        .send(getError({ message: "User name already taken.", user_name }));

    return res.send(
      getSuccessData({ message: "You can use this user name", user_name })
    );
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/check_refrer_code", trimRequest.all, async (req, res) => {
  const { error, value } = refererCodeValidation(req.body);
  if (error) return res.status(404).send(getError(error.details[0].message));

  const { referer_code } = value;
  try {
    const refererCodeExists = await checkUserNameTaken(referer_code);
    if (!refererCodeExists)
      return res
        .status(404)
        .send(getError({ message: "Invalid referer code", referer_code }));

    return res.send(
      getSuccessData({ message: "You can use this referer code", referer_code })
    );
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

module.exports = router;

function makeCircleAvater(req) {
  const width = 27,
    r = width / 2,
    circleShape = Buffer.from(
      `<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`
    );

  return sharp(req.file.path)
    .resize(width, width)
    .composite([
      {
        input: circleShape,
        blend: "dest-in",
      },
    ])
    .png()
    .toFile(`${req.file.destination}/bottom_bar_${req.file.filename}`);
}

function deleteUploadedImage(req) {
  try {
    const file = req.file;
    if (file) {
      fs.unlinkSync(file.path);
    }
  } catch (error) {
    console.log(error);
  }
}
