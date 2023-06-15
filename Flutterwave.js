const Flutterwave = require("flutterwave-node-v3");
const { getEnv } = require("./config");

class FlutterWave {
  static Flw = new Flutterwave(
    getEnv("FLUTTERWAVE_PUBLIC_KEY"),
    getEnv("FLUTTERWAVE_SECRET_KEY")
  );
  static setupFLltterWave() {
    console.log("Flutterwave Setup");
    // this.Flw = new Flutterwave(
    //   getEnv("FLUTTERWAVE_PUBLIC_KEY"),
    //   getEnv("FLUTTERWAVE_SECRET_KEY")
    // );
  }
}

module.exports = FlutterWave;
