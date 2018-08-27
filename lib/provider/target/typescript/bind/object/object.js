"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function baseGenerate(config, nschema, target, template, typescript) {
    return typescript.generate(nschema, config, template, target);
}
const templates = {};
class NObject {
    constructor() {
        this.typescript = undefined;
    }
    init(nschema) {
        if (!this.typescript) {
            throw new Error("Argument exception");
        }
        const typescript = this.typescript;
        templates.object = nschema.buildTemplate(path.resolve(__dirname, "class.ejs"));
        nschema.registerTarget({
            description: "Generate typescript models for your nineschema definitions",
            language: "typescript",
            name: "typescript/object",
            type: "object",
            generate(config, thisNschema, target) {
                return baseGenerate(config, thisNschema, target, templates.object, typescript);
            }
        });
        return Promise.resolve(true);
    }
}
exports.NObject = NObject;
const obj = new NObject();
exports.default = obj;
//# sourceMappingURL=object.js.map