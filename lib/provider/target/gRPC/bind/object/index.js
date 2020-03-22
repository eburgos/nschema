"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
async function baseGenerate(config, nschema, target, template, grpc, context) {
    return grpc.generate(nschema, config, template, target, context);
}
const objectTemplate = (data, nschema, context) => {
    if (data.type === "message" || data.type === "service") {
        throw new Error("Invalid argument");
    }
    return `${data.description
        ? data.description
            .split("\n")
            .map((line) => `// ${line}`)
            .join("\n")
        : ""}
message ${data.name} {
${Object.keys(data.properties || {})
        .map((prop, idx) => {
        if (!data.properties) {
            throw new Error("Invalid argument");
        }
        const property = data.properties[prop];
        return `${property.description
            ? property.description
                .split("\n")
                .map((line) => `  // ${line}`)
                .join("\n")
            : ""}
  ${__1.typeName(property.type, nschema, data.namespace, data.name, context)} ${prop} = ${idx + 1};`;
    })
        .join("\n")}
}
`;
};
const serviceTemplate = (data) => {
    if (data.type === "message" || data.type === "object") {
        throw new Error("Invalid argument");
    }
    return `${data.description
        ? data.description
            .split("\n")
            .map((line) => `// ${line}`)
            .join("\n")
        : ""}
service ${data.name} {
${Object.keys(data.operations)
        .map((operationName) => {
        const operation = data.operations[operationName];
        return `${operation.description
            ? operation.description
                .split("\n")
                .map((line) => `  // ${line}`)
                .join("\n")
            : ""}
  rpc ${operationName}(${(operation.inMessage.data || [])
            .map((argument) => typeof argument.type === "object" ? argument.type.name : argument.type)
            .join(", ")}) returns (${(operation.outMessage.data || [])
            .map((argument) => typeof argument.type === "object" ? argument.type.name : argument.type)
            .join(", ")}) {}`;
    })
        .join("\n")}
}
`;
};
const templates = {
    object: objectTemplate,
    service: serviceTemplate
};
class NObject {
    constructor() {
        this.grpc = undefined;
    }
    async init(nschema) {
        if (!this.grpc) {
            throw new Error("Argument exception");
        }
        const grpc = this.grpc;
        nschema.registerTarget({
            description: "Generate gRPC models for your nineschema definitions",
            language: "gRPC",
            name: "gRPC/object",
            type: "object",
            async generate(config, thisNschema, target, context) {
                return baseGenerate(config, thisNschema, target, templates.object, grpc, context);
            }
        });
        nschema.registerTarget({
            description: "Generate gRPC services for your nineschema definitions",
            language: "gRPC",
            name: "gRPC/service",
            type: "service",
            async generate(config, thisNschema, target, context) {
                return baseGenerate(config, thisNschema, target, templates.service, grpc, context);
            }
        });
        return true;
    }
}
exports.NObject = NObject;
const obj = new NObject();
exports.default = obj;
