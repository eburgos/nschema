"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function execute(parentConfig, nschema) {
    const location = parentConfig.$importLocation || "";
    const newLocation = path.resolve(parentConfig.$nschemaLocation || "", location);
    const newConfig = require(newLocation);
    if (!newConfig) {
        throw new Error(`Invalid import location: ${location}`);
    }
    return nschema.generate(parentConfig, newConfig);
}
const $import = {
    description: "Reference external files in your NSchema tasks",
    execute,
    name: "import",
    type: "type",
    init(nschema) {
        nschema.register("type", this);
        return Promise.resolve(null);
    }
};
exports.default = $import;
//# sourceMappingURL=import.js.map