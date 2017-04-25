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
    var templates = {};
    class NRest {
        init(nschema) {
            let fsharp = this.fsharp;
            templates['consumer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer.ejs'));
            templates['producer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceProducer.ejs'));
            ['consumer', 'producer']
                .forEach(function (serviceType) {
                nschema.registerTarget({
                    type: 'service',
                    language: 'fsharp',
                    name: 'fsharp/rest',
                    bind: 'rest',
                    description: 'Rest services in fsharp',
                    serviceType: serviceType,
                    generate: function (config, nschema, target) {
                        return baseGenerate(config, nschema, target, templates[serviceType], fsharp);
                    }
                });
            });
            return Promise.resolve(null);
        }
    }
    let rest = new NRest();
    exports.default = rest;
});
//# sourceMappingURL=rest.js.map