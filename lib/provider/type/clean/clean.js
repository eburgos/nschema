"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const excludedConfigNames = ["$type", "$namespace", "list"];
function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        files.forEach((file) => {
            const curPath = `${folderPath}/${file}`;
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
    const arr = (parentConfig.target || []).map(i => {
        return i.location;
    });
    const len = arr.length;
    const newConfig = nschema.objClone(parentConfig);
    nschema.mixinRecursive(newConfig, parentConfig, (_1, _2, p) => {
        return excludedConfigNames.indexOf(p) < 0;
    });
    if (parentConfig.$namespace) {
        newConfig.namespace += `.${parentConfig.$namespace}`;
    }
    for (let cnt = 0; cnt < len; cnt += 1) {
        const cur = arr[cnt];
        const realFolder = path.resolve(cur);
        if (fs.existsSync(realFolder)) {
            if (fs.lstatSync(realFolder).isDirectory()) {
                console.log(`deleting folder ${realFolder}`);
                deleteFolderRecursive(realFolder);
            }
            else {
                console.log(`deleting file ${realFolder}`);
                fs.unlinkSync(realFolder);
            }
        }
    }
    return Promise.resolve(true);
}
const clean = {
    description: "Cleans directories. Normally used prior generation.",
    execute,
    name: "clean",
    init(nschema) {
        nschema.register("type", this);
        return Promise.resolve(null);
    },
    type: "type"
};
exports.default = clean;
//# sourceMappingURL=clean.js.map