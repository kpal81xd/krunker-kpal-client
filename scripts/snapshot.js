const { execFileSync } = require("child_process");
const electronLink = require("electron-link");
const path = require("path");
const fs = require("fs");
const vm = require("vm");

const K = "[+]";
const I = "[*]";
const E = "[-]";

const isWIN = process.platform == "win32";
const BASE_PATH = path.join(__dirname, "../js");
const CACHE_PATH = path.join(__dirname, "../cache");
const MK_SNAPSHOT_PATH = path.join("node_modules/electron-mksnapshot/mksnapshot.js");
const TERSER = `terser${isWIN ? ".cmd" : ""}`;
const JS_OBFUSCATOR = `javascript-obfuscator${isWIN ? ".cmd" : ""}`;

// const CORE_MODULES = new Set(["electron", "worker_threads"]);
// const LINK_EXCLUDE_SUBPATHS = ["glob/glob.js", "signal-exit/index.js", "write-file-atomic/index.js"];

module.exports = async function (source, linked, snapshot) {
  // CREATE SNAPSHOT OF FILE
  console.log(I, "linking file");
  const response = await electronLink({
    baseDirPath: BASE_PATH,
    mainPath: source,
    cachePath: CACHE_PATH,
    shouldExcludeModule: () => false,
    // shouldExcludeModule: ({ requiredModulePath }) => {
    //   return (
    //     CORE_MODULES.has(requiredModulePath) ||
    //     LINK_EXCLUDE_SUBPATHS.some((subpath) => requiredModulePath === path.join(__dirname, "../node_modules", subpath))
    //   );
    // },
  });
  fs.writeFileSync(linked, response.snapshotScript);
  console.log(K, "link succeeded");

  // PACKING
  console.log(I, "packing file");
  execFileSync(TERSER, [
    "-c",
    "-m",
    "-o",
    path.join(__dirname, "..", linked),
    "--",
    path.join(__dirname, "..", linked),
  ]);
  execFileSync(JS_OBFUSCATOR, [path.join(__dirname, "..", linked), "-o", path.join(__dirname, "..", linked)]);
  console.log(I, "packing succeeded");

  // VERIFY SNAPSHOT CAN RUN
  console.log(I, "verifying file");
  vm.runInNewContext(response.snapshotScript, undefined, { filename: linked, displayErrors: true });
  console.log(K, "verification succeeded");

  // GENERATE BLOB FROM SCRIPT
  console.log(I, "generating blob");
  execFileSync("node", [
    MK_SNAPSHOT_PATH,
    path.join(__dirname, "..", linked),
    "--output_dir",
    path.join(__dirname, "..", snapshot),
  ]);
  console.log(K, "generation succeeded");
};
