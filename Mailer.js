const nodemailer = require("nodemailer");
const { getEnv } = require("./config");

class Mailer {
  static transporter = null;
  static setupTransporter() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: getEnv("MAIL_USERNAME"),
        pass: getEnv("MAIL_PASSWORD"),
      },
    });
  }

  static async sendMail(reciver_email, subject, text) {
    await this.transporter.sendMail({
      from: {
        name: getEnv("MAIL_FROM_NAME"),
        address: getEnv("MAIL_FROM_ADDRESS"),
      },
      to: reciver_email,
      subject,
      text,
    });
  }
}

module.exports = Mailer;
