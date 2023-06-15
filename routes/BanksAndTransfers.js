const router = require("express").Router();

const trimRequest = require("trim-request");

const FlutterWave = require("../Flutterwave");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

const { bankAccountValidation } = require("./validate");
const { getError, getSuccessData } = require("../helpers");
const { default: axios } = require("axios");
const { getEnv } = require("../config");

//
//
//

router.get("/get_all_banks", async (req, res) => {
  try {
    const flw = FlutterWave.Flw;
    try {
      const payload = {
        country: "NG", //Pass either NG, GH, KE, UG, ZA or TZ to get list of banks in Nigeria, Ghana, Kenya, Uganda, South Africa or Tanzania respectively
      };
      const response = await flw.Bank.country(payload);
      return res.send(getSuccessData(response.data));
    } catch (flwErr) {
      console.log("flwErr", flwErr);
      return res.status(404).send(getError(flwErr.message));
    }
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

router.post("/add_bank_account", trimRequest.body, async (req, res) => {
  try {
    const { _id: my_id } = req.user;

    const { error, value } = bankAccountValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { account_bank, account_number, bank_name } = value;
    console.log(value);
    await axios
      .post("https://api.flutterwave.com/v3/accounts/resolve", value, {
        headers: {
          Authorization: `Bearer ${getEnv("FLUTTERWAVE_SECRET_KEY")}`,
        },
      })
      .then(async (response) => {
        const userBankAccount = await prisma.userBankAccount.findFirst({
          where: {
            user_id: my_id,
          },
        });
        if (userBankAccount) {
          await prisma.userBankAccount.update({
            where: {
              id: userBankAccount.id,
            },
            data: {
              account_bank,
              account_number,
              bank_name,
            },
          });
          return res.send(getSuccessData("Bank account successfully updated"));
        } else {
          await prisma.userBankAccount.create({
            data: {
              user_id: my_id,
              account_bank,
              account_number,
              bank_name,
            },
          });
          return res.send(getSuccessData("Bank account successfully added"));
        }
      })
      .catch((apiError) => {
        if (apiError?.response?.data?.message) {
          console.log(apiError.response.data.message);
          return res.status(404).send(getError(apiError.response.data.message));
        }
        return res.status(404).send(getError("Invalid bank account"));
      });
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

module.exports = router;
