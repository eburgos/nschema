"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function baseGenerate(config, nschema, target, template, fsharp) {
    return fsharp.generate(nschema, config, template, target);
}
const templates = {};
class NRest {
    init(nschema) {
        if (!this.fsharp) {
            throw new Error("Argument exception");
        }
        const fsharp = this.fsharp;
        templates.consumer = nschema.buildTemplate(path.resolve(__dirname, "serviceConsumer.ejs"));
        templates.producer = nschema.buildTemplate(path.resolve(__dirname, "serviceProducer.ejs"));
        ["consumer", "producer"].forEach(serviceType => {
            nschema.registerTarget({
                bind: "rest",
                description: "Rest services in fsharp",
                language: "fsharp",
                name: "fsharp/rest",
                serviceType,
                type: "service",
                generate(config, thisNschema, target) {
                    return baseGenerate(config, thisNschema, target, templates[serviceType], fsharp);
                }
            });
        });
        return Promise.resolve(null);
    }
}
exports.NRest = NRest;
const rest = new NRest();
exports.default = rest;
//# sourceMappingURL=rest.js.map