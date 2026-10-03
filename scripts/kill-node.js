const find = require("find-process");

find("name", "node.exe", true).then((list) => list.forEach((e) => process.kill(e.pid)));
