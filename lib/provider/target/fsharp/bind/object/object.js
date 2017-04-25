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
    function baseGenerate(config, nschema, target, template, fsharp) {
        return fsharp.generate(nschema, config, template, target);
    }
    let templates = {};
    class NObject {
        init(nschema) {
            let fsharp = this.fsharp;
            templates['object'] = nschema.buildTemplate(path.resolve(__dirname, 'class.ejs'));
            nschema.registerTarget({
                name: 'fsharp/object',
                type: 'object',
                language: 'fsharp',
                description: 'Generate fsharp models for your nineschema definitions',
                generate: function (config, nschema, target) {
                    return baseGenerate(config, nschema, target, templates['object'], fsharp);
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