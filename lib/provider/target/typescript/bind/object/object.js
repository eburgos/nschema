"use strict";
import * as path from "path";
function baseGenerate(config, nschema, target, template, typescript) {
    return typescript.generate(nschema, config, template, target);
}
const templates = {};
export class NObject {
    init(nschema) {
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
const obj = new NObject();
export default obj;
//# sourceMappingURL=object.js.map