"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
function baseGenerate(config, nschema, target, template, typescript, context) {
    return typescript.generate(nschema, config, template, target, context);
}
const templates = {};
class AmqpRpc {
    init(nschema) {
        if (!this.typescript) {
            throw new Error("Argument exception");
        }
        const typescript = this.typescript;
        templates.consumer = nschema.buildTemplate(path.resolve(__dirname, "serviceConsumer.ejs"));
        templates.producer = nschema.buildTemplate(path.resolve(__dirname, "serviceProducer.ejs"));
        ["consumer", "producer"].forEach(serviceType => {
            nschema.registerTarget({
                bind: "amqpRpc",
                description: "Generates a service layer where messages get sent over an AMQP protocol",
                language: "typescript",
                name: "typescript/amqpRpc",
                serviceType,
                type: "service",
                generate(config, thisNschema, target, context) {
                    return baseGenerate(config, thisNschema, target, templates[serviceType], typescript, context);
                }
            });
        });
        return Promise.resolve(null);
    }
}
exports.AmqpRpc = AmqpRpc;
const amqprpc = new AmqpRpc();
exports.default = amqprpc;
//# sourceMappingURL=amqpRpc.js.map