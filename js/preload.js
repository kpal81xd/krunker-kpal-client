require("./log.js")();

let glob;
if (typeof snapshotResult !== "undefined") {
  console.log("Preload using Snapshot");
  snapshotResult.setGlobals(global, process, global, {}, console, require);
  glob = snapshotResult.customRequire("./load.js");
} else {
  console.log("Preload using Raw");
  glob = require("./load.js");
}

glob.preload(require("electron"), new (require("electron-store"))(), __dirname);
