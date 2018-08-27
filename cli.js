"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimist = require("minimist");
const path = require("path");
const nschema_1 = require("./lib/nschema");
const argv = minimist(process.argv.slice(2));
const files = argv._;
if (argv.features) {
    nschema_1.features();
}
else {
    files.forEach(item => {
        if (item.indexOf("/") !== 0) {
            item = path.resolve(process.cwd(), item);
        }
        const r = require(item);
        nschema_1.generate(nschema_1.getConfig(path.dirname(item)), r);
    });
}
//# sourceMappingURL=cli.js.map