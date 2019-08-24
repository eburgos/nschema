"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = require("path");
const utils_1 = require("../../../utils");
function execute(parentConfig, nschema, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (parentConfig.type !== "import") {
            throw new Error("Invalid import task");
        }
        const location = parentConfig.importLocation || "";
        const newLocation = path_1.resolve(parentConfig.nschemaLocation || "", location);
        const cfg = utils_1.requireDefaultOrPackage(newLocation);
        return nschema.generate(parentConfig, cfg, context);
    });
}
const $import = {
    description: "Reference external files in your NSchema tasks",
    execute,
    name: "import",
    type: "type",
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            nschema.register("type", this);
            return Promise.resolve(null);
        });
    }
};
exports.default = $import;
