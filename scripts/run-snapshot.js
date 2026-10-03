const snapshot = require("./snapshot.js");

const isMAC = process.platform == "darwin";
const MAC_ELECTRON_PATH =
  "./node_modules/electron/dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Resources";
const WIN_LINUX_ELECTRON_PATH = "./node_modules/electron/dist";

(async () => {
  await snapshot("./js/load.js", "./cache/out.js", isMAC ? MAC_ELECTRON_PATH : WIN_LINUX_ELECTRON_PATH);
})();
