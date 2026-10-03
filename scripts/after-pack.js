const snapshot = require("./snapshot.js");

const isWIN = process.platform == "win32";
const isMAC = process.platform == "darwin";

const MAC_DIST = "./dist/mac/KPal Client.app/Contents/Frameworks/Electron Framework.framework/Resources";
const WIN_DIST = (is32) => `./dist/win-${is32 ? "ia32-" : ""}unpacked`;
const LINUX_DIST = (is32) => `./dist/linux-${is32 ? "ia32-" : ""}unpacked`;

exports.default = async (context) => {
  const IA32 = context.appOutDir.includes("ia32");
  await snapshot("./js/load.js", "./cache/out.js", isWIN ? WIN_DIST(IA32) : isMAC ? MAC_DIST : LINUX_DIST(IA32));
};
