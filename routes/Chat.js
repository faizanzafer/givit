const router = require("express").Router();
const trimRequest = require("trim-request");
const _ = require("lodash");

const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;

const uploadUserFile = require("../middlewares/FileMulter");

const {
  fetchMessageValidation,
  deleteMessagesValidation,
} = require("./validate");
const { getError, getSuccessData } = require("../helpers");
const { getEnv } = require("../config");
const { getUserfromId } = require("../database_queries/Auth");

const {
  updateUsersChannel,
  getUsersChannel,
  createUsersChannel,
  sendMessageToUsersChannel,
} = require("../database_queries/Chat");

router.post("/send_media", uploadUserFile, async (req, res) => {
  try {
    if (req.file_error) return res.status(404).send(getError(req.file_error));

    const file = req.file;
    const file_url = file?.path
      ? `${getEnv("APP_URL")}/${file.path.split("public/")[1]}`
      : null;

    if (file_url == null)
      return res.status(404).send(getError("Error uploading file."));

    return res.send(getSuccessData(file_url));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.get("/get_message_contact", async (req, res) => {
  try {
    const { _id: user_id } = req.user;
    let { offset } = req.query;
    offset = !offset ? 0 : parseInt(offset);

    const usersChannels = await getUserChannels(user_id, offset);

    const contacts = getMessageContacts(usersChannels, user_id);
    const sortedContacts = _.orderBy(contacts, ["last_message_time"], ["desc"]);

    return res.send(getSuccessData(sortedContacts));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/fetch_messages", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = fetchMessageValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const user_id = req.user._id;
    const { to_id, page } = value;

    if (user_id == to_id)
      return res.status(404).send(getError("to_id should not be your id"));

    const other_user = await getUserfromId(to_id);
    if (!other_user)
      return res
        .status(404)
        .send(getError("Sorry, Other user is not available in out records"));

    const offset = page >= 1 ? parseInt(page) - 1 : 0;

    const usersChannel = await getUsersChannel(
      to_id,
      user_id,
      true,
      parseInt(offset)
    );

    if (!usersChannel) return res.status(404).send(getSuccessData([]));

    if (isUsersChannelAllowedForMe(usersChannel, user_id, true))
      return res.send(getSuccessData([]));

    const channelMessage = [];

    usersChannel.channel_messages.forEach((channel_message) => {
      const message = {
        id: channel_message.id,
        from_id: channel_message.from_id,
        to_id: channel_message.to_id,
        message_body: channel_message.message_body,
        message_type: channel_message.message_type,
        attachments: channel_message.attachments
          ? JSON.parse(channel_message.attachments)
          : null,
        seen: channel_message.seen,
        last_message_time: channel_message.created_at,
      };
      channelMessage.push(message);
    });

    return res.send(getSuccessData(channelMessage));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/seen", trimRequest.all, async (req, res) => {
  try {
    const { to_id } = req.body.to_id;
    if (!to_id) return res.status(404).send(getError("to_id is required."));

    const user_id = req.user._id;

    if (user_id == to_id)
      return res.status(404).send(getError("to_id should not be your id"));

    const other_user = await getUserfromId(to_id);
    if (!other_user)
      return res
        .status(404)
        .send(getError("Sorry, Other user is not available in out records"));

    const usersChannel = await getUsersChannel(to_id, user_id);

    if (!usersChannel)
      return res.status(404).send(getError("No conversation started yet."));

    if (!isUsersChannelAllowedForMe(usersChannel, user_id))
      return res.status(404).send(getError("You have deleted this chat"));

    await makeMessagesSeen(usersChannel, user_id);

    return res.send(getSuccessData("All messages seen"));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/delete_messages", trimRequest.all, async (req, res) => {
  try {
    const { error, value } = deleteMessagesValidation(req.body);
    if (error) return res.status(404).send(getError(error.details[0].message));

    const user_id = req.user._id;
    const { to_id, message_ids } = value;

    const decoded_ids = JSON.parse(message_ids);

    if (!Array.isArray(decoded_ids))
      return res
        .status(404)
        .send(getError("message_ids are not in valid format"));

    if (user_id == to_id)
      return res.status(404).send(getError("to_id should not be your id"));

    const other_user = await getUserfromId(to_id);
    if (!other_user)
      return res
        .status(404)
        .send(getError("Sorry, Other user is not available in out records"));

    const usersChannel = await getUsersChannel(to_id, user_id);

    if (!usersChannel)
      return res.status(404).send(getError("No conversation started yet."));

    if (!isUsersChannelAllowedForMe(usersChannel, user_id))
      return res.status(404).send(getError("You have deleted this chat"));

    await deleteMessages(usersChannel, user_id, message_ids);

    return res.send(getSuccessData("Messages successfully deleted"));
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

router.post("/delete_conversation", trimRequest.all, async (req, res) => {
  try {
    const { to_id } = req.body.to_id;
    if (!to_id) return res.status(404).send(getError("to_id is required."));

    const user_id = req.user._id;

    if (user_id == to_id)
      return res.status(404).send(getError("to_id should not be your id"));

    const other_user = await getUserfromId(to_id);
    if (!other_user)
      return res
        .status(404)
        .send(getError("Sorry, Other user is not available in out records"));

    const usersChannel = await getUsersChannel(to_id, user_id);

    if (!usersChannel)
      return res.status(404).send(getError("No conversation started yet."));

    if (!isUsersChannelAllowedForMe(usersChannel, user_id))
      return res.status(404).send(getError("You have deleted this chat"));

    if (
      usersChannel.delete_conversation_for_from_id == true ||
      usersChannel.delete_conversation_for_to_id == true
    ) {
      await deleteWholeConversation(usersChannel);

      return res.send(getSuccessData("Conversation deleted."));
    } else {
      await deleteSingleUserConversation(usersChannel, user_id);

      return res.send(getSuccessData("Conversation deleted for single user."));
    }
  } catch (catchError) {
    if (catchError && catchError.message) {
      return res.status(404).send(getError(catchError.message));
    }
    return res.status(404).send(getError(catchError));
  }
});

module.exports = router;

function makeMessagesSeen(usersChannel, user_id) {
  return prisma.channelMessages.updateMany({
    where: {
      users_channels_id: usersChannel.id,
      to_id: user_id,
    },
    data: {
      seen: true,
    },
  });
}

function deleteMessages(usersChannel, user_id, message_ids) {
  return prisma.channelMessages.deleteMany({
    where: {
      users_channels_id: usersChannel.id,
      to_id: user_id,
      id: {
        in: message_ids,
      },
    },
  });
}

function deleteWholeConversation(usersChannel) {
  const deleteConversation = prisma.channelMessages.deleteMany({
    where: {
      users_channels_id: usersChannel.id,
    },
  });
  const deleteUsersChannel = prisma.userChannel.delete({
    where: {
      id: usersChannel.id,
    },
  });
  return prisma.$transaction([deleteConversation, deleteUsersChannel]);
}

function deleteSingleUserConversation(usersChannel, user_id) {
  const deleteConversationForMe = prisma.userChannel.update({
    where: {
      id: usersChannel.id,
    },
    data: {
      delete_conversation_for_to_id:
        user_id == usersChannel.to_id
          ? true
          : usersChannel.delete_conversation_for_to_id,
      delete_conversation_for_from_id:
        user_id == usersChannel.from_id
          ? true
          : usersChannel.delete_conversation_for_from_id,
    },
  });
  const deleteChannelMessagesForSingleUser = prisma.channelMessages.deleteMany({
    where: {
      users_channels_id: usersChannel.id,
      to_id: user_id,
    },
  });
  return prisma.$transaction([
    deleteConversationForMe,
    deleteChannelMessagesForSingleUser,
  ]);
}

function getMessageContacts(usersChannels, user_id) {
  const contacts = [];

  usersChannels.forEach((usersChannel) => {
    if (isUsersChannelAllowedForMe(usersChannel, user_id, false)) {
      const primaryUser = usersChannel.primary_user;
      const secondaryUser = usersChannel.secondary_user;
      const channelMessages = usersChannel.channel_messages;

      const user =
        primaryUser?.id == user_id
          ? secondaryUser
          : secondaryUser?.id == user_id
          ? primaryUser
          : null;

      if (user) {
        const lastMessage =
          channelMessages.length > 0 ? channelMessages[0] : null;

        const unSeenMessagesCounter = channelMessages.filter(
          (channelMessage) => channelMessage.seen == false
        ).length;

        const messageContact = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          last_message: lastMessage ? lastMessage.message_body : null,
          last_message_time: lastMessage ? lastMessage.created_at : null,
          un_seen_messages_counter: unSeenMessagesCounter,
        };
        contacts.push(messageContact);
      }
    }
  });
  return contacts;
}

function isUsersChannelAllowedForMe(usersChannel, user_id, status = false) {
  return (
    (usersChannel.from_id == user_id &&
      usersChannel.delete_conversation_for_from_id == status) ||
    (usersChannel.to_id == user_id &&
      usersChannel.delete_conversation_for_to_id == status)
  );
}

function getUserChannels(user_id, offset) {
  return prisma.userChannel.findMany({
    where: {
      OR: [
        {
          to_id: user_id,
        },
        {
          from_id: user_id,
        },
      ],
    },
    select: {
      id: true,
      to_id: true,
      from_id: true,
      delete_conversation_for_to_id: true,
      delete_conversation_for_from_id: true,
      primary_user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      secondary_user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      channel_messages: {
        where: {
          to_id: user_id,
        },
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
    skip: offset,
    take: 25,
  });
}
