const socketio = require("socket.io");
const { getEnv } = require("./config");
const { getUserfromId } = require("./database_queries/Auth");
const {
  getUsersChannel,
  createUsersChannel,
  sendMessageToUsersChannel,
  updateUsersChannel,
} = require("./database_queries/Chat");
const { messageValidation } = require("./routes/validate");
const { getError, getSuccessData } = require("./helpers");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  getUserFromToken,
} = require("./users");
const { MessageType } = require(".prisma/client");

class Socket {
  static io = null;
  static async setupSocket(server) {
    this.io = socketio(server);

    this.io.on("connect", (socket) => {
      console.log("socket id: ", socket.id);
      socket.on("join", async ({ token }, callback) => {
        try {
          const { error, user } = await addUser({ token, socketId: socket.id });

          if (error) return callback(getError(error));
          return callback(
            getSuccessData("User Connected to Socket Successfully")
          );
        } catch (catchError) {
          if (catchError && catchError.message) {
            console.log(getError(catchError.message));
            return;
          }
          console.log(getError(catchError));
          return;
        }
      });

      socket.on("sendMessage", async ({ token, message }, callback) => {
        try {
          if (!token) return callback(getError("token is required."));
          if (!message)
            return callback(getError("message object is required."));

          const { error: validationError, value } = messageValidation(message);
          if (validationError)
            return callback(getError(validationError.details[0].message));

          const { error, userData } = await getUserFromToken(token);
          if (error) {
            return callback(getError(error));
          }

          const user_id = userData.id;
          const userPrimary = getUser(user_id, socket.id);
          if (!userPrimary) {
            return callback(
              getError("un registered user in sockets cannot send message")
            );
          }

          const {
            to_id,
            message_type,
            attachment,
            media_type,
            message_body,
            uuid,
          } = value;

          if (user_id == to_id)
            return callback(getError("you cannot send message to yourself"));

          const other_user = await getUserfromId(to_id);
          if (!other_user)
            return callback(
              getError("Sorry, Other user is not available in out records")
            );

          let data_attachments = null;
          if (message_type == MessageType.MEDIA) {
            data_attachments = {
              attachment,
              media_type,
            };
          }

          let data = {
            to_id,
            from_id: user_id,
            message_body:
              !message_body && data_attachments ? "Attachment" : message_body,
            message_type,
            attachments: data_attachments
              ? JSON.stringify(data_attachments)
              : null,
          };

          const is_users_channel_already_created = await getUsersChannel(
            to_id,
            user_id
          );

          const user = getUser(message.to_id);

          if (!is_users_channel_already_created) {
            const users_channel = await createUsersChannel(data);

            data.channel_id = users_channel.id;

            console.log("sending message body upper", data);

            const users_channel_message = await sendMessageToUsersChannel(data);
            users_channel_message.attachments =
              users_channel_message.attachments
                ? JSON.parse(users_channel_message.attachments)
                : null;
            users_channel_message.uuid = uuid;
            //
            //  Sending event to reciever end
            //
            if (user) {
              this.io
                .to(user.socketId)
                .emit("recieveMessage", getSuccessData(users_channel_message));
              console.log(
                "sending message to sender user one to one on socket upper",
                users_channel_message
              );
            } else {
              console.log(
                "sending message to sender user one to one off socket upper",
                users_channel_message
              );
            }
            this.io
              .to(socket.id)
              .emit("recieveMessage", getSuccessData(users_channel_message));
            return callback(getSuccessData(users_channel_message));
          }

          data.channel_id = is_users_channel_already_created.id;

          /// Updating users channel again visible for the user
          /// who deleted chat from his side.
          await updateUsersChannel(is_users_channel_already_created);

          const users_channel_message = await sendMessageToUsersChannel(data);
          users_channel_message.attachments = users_channel_message.attachments
            ? JSON.parse(users_channel_message.attachments)
            : null;

          users_channel_message.uuid = uuid;

          console.log("sending message body lower", data);

          if (user) {
            this.io
              .to(user.socketId)
              .emit("recieveMessage", getSuccessData(users_channel_message));
            console.log(
              "sending message to sender user one to one on socket lower",
              users_channel_message
            );
          } else {
            console.log(
              "sending message to sender user one to one off socket lower",
              users_channel_message
            );
          }
          this.io
            .to(socket.id)
            .emit("recieveMessage", getSuccessData(users_channel_message));

          return callback(getSuccessData(users_channel_message));
        } catch (catchError) {
          if (catchError && catchError.message) {
            console.log(getError(catchError.message));
            return;
          }
          console.log(getError(catchError));
          return;
        }
      });

      socket.on("disconnect", () => {
        const user = removeUser(socket.id);
        console.log("socket disconnected", socket.id, user);
      });
    });
  }
}

module.exports = Socket;
