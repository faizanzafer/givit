const Prisma_Client = require("../Prisma");
const prisma = Prisma_Client.prismaClient;
const { MessageType } = require(".prisma/client");

function updateUsersChannel(is_users_channel_already_created) {
  return prisma.userChannel.update({
    where: { id: is_users_channel_already_created.id },
    data: {
      delete_conversation_for_from_id: false,
      delete_conversation_for_to_id: false,
    },
  });
}

function getUsersChannel(
  to_id,
  user_id,
  getChannelMessages = false,
  offset = 0
) {
  return prisma.userChannel.findFirst({
    where: {
      OR: [
        {
          from_id: to_id,
          to_id: user_id,
        },
        {
          to_id,
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
      channel_messages:
        getChannelMessages == true
          ? {
              where: {
                to_id: user_id,
              },
              skip: offset * 25,
              take: 25,
              orderBy: { created_at: "desc" },
            }
          : false,
    },
  });
}

function createUsersChannel(data) {
  const { to_id, from_id } = data;
  return prisma.userChannel.create({
    data: { to_id, from_id },
  });
}

async function sendMessageToUsersChannel(data) {
  const {
    to_id,
    from_id,
    channel_id,
    message_body,
    message_type,
    attachments,
  } = data;

  await prisma.channelMessages.create({
    data: {
      to_id: from_id,
      from_id,
      users_channels_id: channel_id,
      message_body,
      message_type,
      attachments,
      seen: true,
    },
  });
  const secondaryUserMessage = await prisma.channelMessages.create({
    data: {
      to_id,
      from_id,
      users_channels_id: channel_id,
      message_body,
      message_type,
      attachments,
    },
  });
  return secondaryUserMessage;
}

module.exports = {
  updateUsersChannel,
  getUsersChannel,
  createUsersChannel,
  sendMessageToUsersChannel,
};
