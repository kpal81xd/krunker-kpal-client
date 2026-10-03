const log = require("electron-log");
const initLogging = (isMain) => {
  if (isMain) log.debug("==================== KPal Client Start ====================");

  console.log = log.info;
  console.info = log.info;
  console.warn = log.warn;
  console.error = log.error;
  console.debug = log.debug;

  if (isMain) {
    process.on("uncaughtException", (error) => {
      if (error) console.error(error);
    });
  }
};
module.exports = initLogging;
