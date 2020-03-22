"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const utils_1 = require("../../../utils");
async function execute(parentConfig, nschema, context) {
    if (parentConfig.type !== "import") {
        throw new Error("Invalid import task");
    }
    const location = parentConfig.importLocation || "";
    const newLocation = path_1.resolve(parentConfig.nschemaLocation || "", location);
    const cfg = utils_1.requireDefaultOrPackage(newLocation);
    return nschema.generate(parentConfig, cfg, context);
}
const $import = {
    description: "Reference external files in your NSchema tasks",
    execute,
    name: "import",
    type: "type",
    async init(nschema) {
        nschema.register("type", this);
        return Promise.resolve(null);
    },
};
exports.default = $import;
