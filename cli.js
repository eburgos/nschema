"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const minimist = require("minimist");
const path_1 = require("path");
const logging_1 = require("./lib/logging");
const nschema_1 = require("./lib/nschema");
const argv = minimist(process.argv.slice(2));
const files = argv._;
if (argv.logLevel) {
    logging_1.setLogLevel(argv.logLevel);
}
if (argv.features) {
    nschema_1.features();
}
else {
    files
        .reduce((acc, item) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
        return acc.then(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
            if (item.indexOf("/") !== 0) {
                item = path_1.resolve(process.cwd(), item);
            }
            const r = require(item);
            return nschema_1.generate(nschema_1.getConfig(path_1.dirname(item)), r.default ? r.default : r);
        }));
    }), Promise.resolve())
        .then(() => {
        process.exit(0);
    }, e => {
        console.error(e);
        process.exit(1);
    });
}
