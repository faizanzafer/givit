const router = require("express").Router();
const jwt = require("jsonwebtoken");
const trimRequest = require("trim-request");

const { emailValidation } = require("./validate");
const { getError, getSuccessData, clean, createToken } = require("../helpers");
const { getEnv } = require("../config");

const {
  checkUserNameTaken,
  getExistingUserFromEmail,
} = require("../database_queries/Auth");

//
const allowed_socials = ["google", "twitter", "facebook"];

router.post(
  "/social_login/:service",
  [tokenAuth, trimRequest.all],
  async (req, res) => {
    try {
      const { value, error } = emailValidation(req.body);
      if (error)
        return res.status(404).send(getError(error.details[0].message));

      const { email } = value;

      const service = req.params["service"];
      const service_allowed = allowed_socials.find(
        (allowed_social) => allowed_social == service
      );
      if (!service_allowed)
        return res
          .status(404)
          .send(
            getError(
              `only ${allowed_socials.map((item) =>
                item.toString()
              )} socials are allowed.`
            )
          );

      const user = await getExistingUserFromEmail(email);

      if (!user)
        return res.status(404).send(getError("Invalid login credentials."));

      return res.send(getSuccessData(await createToken(user)));
    } catch (err) {
      if (err && err.message) {
        return res.status(404).send(getError(err.message));
      }
      return res.status(404).send(getError(err));
    }
  }
);

module.exports = router;

function tokenAuth(req, res, next) {
  try {
    const token = req.header("Authorization");
    if (!token) {
      return res.status(403).send(getError("Access Denied!"));
    }
    const jwtid = getEnv("SOCIAL_JWT_ID");

    const verified = jwt.verify(
      token,
      getEnv("SOCIAL_JWT_SECERET") + getEnv("JWT_SECERET"),
      {
        subject: "GIVIT",
        jwtid,
      }
    );

    if (!verified)
      return res.status(403).send(getError("Unauthorized api call"));
    req.user = verified;
    next();
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
}
