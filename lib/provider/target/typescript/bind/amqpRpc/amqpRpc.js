"use strict";
import * as path from "path";
function baseGenerate(config, nschema, target, template, typescript) {
    return typescript.generate(nschema, config, template, target);
}
const templates = {};
class AmqpRpc {
    init(nschema) {
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
                generate(config, thisNschema, target) {
                    return baseGenerate(config, thisNschema, target, templates[serviceType], typescript);
                }
            });
        });
        return Promise.resolve(null);
    }
}
const amqprpc = new AmqpRpc();
export default amqprpc;
//# sourceMappingURL=amqpRpc.js.map