(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path"], factory);
    }
})(function (require, exports) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    const path = require("path");
    function baseGenerate(config, nschema, target, template, typescript) {
        return typescript.generate(nschema, config, template, target);
    }
    let templates = {};
    class NObject {
        init(nschema) {
            let typescript = this.typescript;
            templates.object = nschema.buildTemplate(path.resolve(__dirname, 'class.ejs'));
            nschema.registerTarget({
                name: 'typescript/object',
                type: 'object',
                language: 'typescript',
                description: 'Generate typescript models for your nineschema definitions',
                generate: function (config, nschema, target) {
                    return baseGenerate(config, nschema, target, templates.object, typescript);
                }
            });
            return Promise.resolve(true);
        }
    }
    exports.NObject = NObject;
    let obj = new NObject();
    exports.default = obj;
});
//# sourceMappingURL=object.js.map