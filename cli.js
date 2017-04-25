(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "minimist", "./lib/nschema", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const minimist = require("minimist");
    const nschema_1 = require("./lib/nschema");
    const path = require("path");
    let argv = minimist(process.argv.slice(2));
    let files = argv._;
    if (argv['features']) {
        nschema_1.features();
    }
    else {
        files.forEach(function (item) {
            if (item.indexOf('/') !== 0) {
                item = path.resolve(process.cwd(), item);
            }
            let r = require(item);
            nschema_1.generate({ $nschemaLocation: path.dirname(item) }, r);
        });
    }
});
//# sourceMappingURL=cli.js.map