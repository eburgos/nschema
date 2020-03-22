"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const logging_1 = require("../lib/logging");
const nschema_1 = require("../lib/nschema");
process.chdir("../../ggpin/main/schema");
let item = "./services/index.js";
if (item.indexOf("/") !== 0) {
    item = path.resolve(process.cwd(), item);
}
logging_1.setLogLevel("Debug");
const definition = require(item);
nschema_1.generate(nschema_1.getConfig(path.dirname(item)), definition);
