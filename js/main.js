require("v8-compile-cache");
require("./log.js")(true);

let glob;
if (typeof snapshotResult !== "undefined") {
  console.log("Main using Snapshot");
  snapshotResult.setGlobals(global, process, global, {}, console, require);
  glob = snapshotResult.customRequire("./load.js");
} else {
  console.log("Main using Raw");
  glob = require("./load.js");
}

glob.main(
  require("electron"),
  require("electron-localshortcut"),
  require("electron-updater").autoUpdater,
  new (require("electron-store"))(),
  require("discord-rpc"),
  __dirname
);
