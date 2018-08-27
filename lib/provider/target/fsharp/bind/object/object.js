"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function baseGenerate(config, nschema, target, template, fsharp) {
    return fsharp.generate(nschema, config, template, target);
}
const templates = {};
class NObject {
    init(nschema) {
        if (!this.fsharp) {
            throw new Error("Argument exception");
        }
        const fsharp = this.fsharp;
        templates.object = nschema.buildTemplate(path.resolve(__dirname, "class.ejs"));
        nschema.registerTarget({
            description: "Generate fsharp models for your nineschema definitions",
            language: "fsharp",
            name: "fsharp/object",
            type: "object",
            generate(config, thisNschema, target) {
                return baseGenerate(config, thisNschema, target, templates.object, fsharp);
            }
        });
        return Promise.resolve(true);
    }
}
exports.NObject = NObject;
const obj = new NObject();
exports.default = obj;
//# sourceMappingURL=object.js.map