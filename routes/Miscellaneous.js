const router = require("express").Router();
const { FollowingApproval, GiveAwaysStatus } = require("@prisma/client");
const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const trimRequest = require("trim-request");
const _ = require("lodash");
const fs = require("fs");
const ImageUploader = require("../middlewares/ImageMulter");

const { getEnv } = require("../config");
const { contactsValidation } = require("./validate");
const {
  getError,
  getSuccessData,
  timeExpired,
  createToken,
  clean,
} = require("../helpers");

//

router.post("/bulk_contact_info", trimRequest.body, async (req, res) => {
  try {
    const { error, value } = contactsValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const { contacts } = value;

    const registeredUsers = await prisma.users.findMany({
      where: {
        phone: {
          in: contacts,
        },
        is_registered: true,
      },
    });

    const contactsCheck = contacts.map((contact) => {
      const contactMatch = registeredUsers.find(
        (user) => contact == user.phone
      );
      if (contactMatch) return { contact, is_registered: true };
      return { contact, is_registered: false };
    });

    const response = _.uniqBy(contactsCheck, "contact");

    return res.send(getSuccessData(response));
  } catch (err) {
    if (err && err.message) {
      return res.status(404).send(getError(err.message));
    }
    return res.status(404).send(getError(err));
  }
});

module.exports = router;
