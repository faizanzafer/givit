const admin = require("firebase-admin");

const serviceAccount = require("./giveaway-84c8d-firebase-adminsdk-mdr7m-64b015f324.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const SendNotification = (
  token,
  notification,
  data = {},
  apns = {},
  android = {}
) => {
  return admin.messaging().send({
    token,
    notification,
    data,
    apns,
    android,
  });
};

module.exports = { SendNotification };
