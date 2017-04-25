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
    class AmqpRpc {
        init(nschema) {
            let typescript = this.typescript;
            templates['consumer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer.ejs'));
            templates['producer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceProducer.ejs'));
            ['consumer', 'producer']
                .forEach(function (serviceType) {
                nschema.registerTarget({
                    name: 'typescript/amqpRpc',
                    type: 'service',
                    language: 'typescript',
                    description: 'Generates a service layer where messages get sent over an AMQP protocol',
                    bind: 'amqpRpc',
                    serviceType: serviceType,
                    generate: function (config, nschema, target) {
                        return baseGenerate(config, nschema, target, templates[serviceType], typescript);
                    }
                });
            });
            return Promise.resolve(null);
        }
    }
    ;
    let amqprpc = new AmqpRpc();
    exports.default = amqprpc;
});
//# sourceMappingURL=amqpRpc.js.map