(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs = require("fs");
    const path = require("path");
    let excludedConfigNames = ['$type', '$namespace', 'list'];
    function deleteFolderRecursive(folderPath) {
        var files = [];
        if (fs.existsSync(folderPath)) {
            files = fs.readdirSync(folderPath);
            files.forEach(function (file) {
                var curPath = folderPath + '/' + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                }
                else {
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(folderPath);
        }
    }
    function execute(parentConfig, nschema) {
        var cnt, arr = parentConfig.target.map(function (i) { return i.location; }), len = arr.length, cur, realFolder, newConfig = nschema.objClone(parentConfig);
        nschema.mixinRecursive(newConfig, parentConfig, function (_1, _2, p) {
            return excludedConfigNames.indexOf(p) < 0;
        });
        if (parentConfig.$namespace) {
            newConfig.namespace += '.' + parentConfig.$namespace;
        }
        for (cnt = 0; cnt < len; cnt += 1) {
            cur = arr[cnt];
            realFolder = path.resolve(cur);
            if (fs.existsSync(realFolder)) {
                if (fs.lstatSync(realFolder).isDirectory()) {
                    console.log('deleting folder ' + realFolder);
                    deleteFolderRecursive(realFolder);
                }
                else {
                    console.log('deleting file ' + realFolder);
                    fs.unlinkSync(realFolder);
                }
            }
        }
        return Promise.resolve(true);
    }
    let clean = {
        type: 'type',
        name: 'clean',
        description: 'Cleans directories. Normally used prior generation.',
        init: function (nschema) {
            nschema.register('type', this);
            return Promise.resolve(null);
        },
        execute: execute
    };
    exports.default = clean;
});
//# sourceMappingURL=clean.js.map