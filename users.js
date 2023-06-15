const jwt = require("jsonwebtoken");
const { getEnv } = require("./config");
const { getUserfromId } = require("./database_queries/Auth");

const users = [];

const addUser = async ({ token, socketId }) => {
  if (!token) return { error: "Token is required." };

  try {
    const { error: err, userData } = await getUserFromToken(token);
    if (err) {
      return { error: err };
    }
    const id = userData.id;
    const existingUser = users.find((user) => user.id == id);

    if (existingUser) return { error: "This User is already Connected." };

    const user = { id, socketId, token };

    users.push(user);

    return { user };
  } catch (err) {
    return { error: err };
  }
};

const removeUser = (socketId) => {
  const index = users.findIndex((user) => user.socketId === socketId);

  if (index !== -1) return users.splice(index, 1)[0];
};

const getUserFromToken = async (token) => {
  if (!token) return { error: "Token is required." };

  try {
    const verified = jwt.verify(token, getEnv("JWT_SECERET"));
    const { _id: id } = verified;
    const user = await getUserfromId(id);
    if (!user)
      return {
        error: "Unauthorized! Please login again to refresh token.",
      };
    return { userData: user };
  } catch (catchError) {
    if (catchError && catchError.message) {
      return { error: catchError.message };
    }
    return { error: "Invalid token!." };
  }
};

const getUser = (id, socketId = null) =>
  users.find((user) =>
    socketId ? user.socketId == socketId && user.id === id : user.id == id
  );

const getUsersInRoom = (room = "") => users;

module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  getUserFromToken,
};
