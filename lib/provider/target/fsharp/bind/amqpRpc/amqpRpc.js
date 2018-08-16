"use strict";
import * as path from "path";
function baseGenerate(config, nschema, target, template, fsharp) {
    return fsharp.generate(nschema, config, template, target);
}
const templates = {};
class AmqpRpc {
    init(nschema) {
        const fsharp = this.fsharp;
        templates.consumer = nschema.buildTemplate(path.resolve(__dirname, "serviceConsumer.ejs"));
        templates.producer = nschema.buildTemplate(path.resolve(__dirname, "serviceProducer.ejs"));
        ["consumer", "producer"].forEach(serviceType => {
            nschema.registerTarget({
                bind: "amqpRpc",
                description: "Generates a service layer where messages get sent over an AMQP protocol",
                language: "fsharp",
                name: "fsharp/amqpRpc",
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
const amqprpc = new AmqpRpc();
export default amqprpc;
//# sourceMappingURL=amqpRpc.js.map