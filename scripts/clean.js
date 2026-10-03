const { rimraf } = require("rimraf");

(async () => {
  await rimraf("./cache");
  await rimraf("./dist");
})();
