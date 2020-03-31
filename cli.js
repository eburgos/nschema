"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const path_1 = require("path");
const logging_1 = require("./lib/logging");
const nschema_1 = require("./lib/nschema");
const argv = yargs(process.argv.slice(2)).argv;
const files = argv._;
if (argv.logLevel) {
    logging_1.setLogLevel(argv.logLevel);
}
if (argv.features) {
    nschema_1.features().then(undefined, console.error);
}
else {
    files
        .reduce(async (acc, item) => {
        return acc.then(async () => {
            if (!item.startsWith("/")) {
                item = path_1.resolve(process.cwd(), item);
            }
            const requiredItem = require(item);
            return nschema_1.generate(nschema_1.getConfig(path_1.dirname(item)), requiredItem.default ? requiredItem.default : requiredItem);
        });
    }, Promise.resolve())
        .then(() => {
        process.exit(0);
    }, (err) => {
        console.error(err);
        process.exit(1);
    });
}
