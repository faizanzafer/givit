const dotenv = require("dotenv");

dotenv.config();

// getting value of environment variable
function getEnvVariableValue(variable) {
  return process.env[variable];
}

module.exports.getEnv = getEnvVariableValue;
