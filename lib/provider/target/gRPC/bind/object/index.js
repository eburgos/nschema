"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
function baseGenerate(config, nschema, target, template, grpc, context) {
    return __awaiter(this, void 0, void 0, function* () {
        return grpc.generate(nschema, config, template, target, context);
    });
}
const objectTemplate = (data, nschema, context) => {
    if (data.$type === "message" || data.$type === "service") {
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
const serviceTemplate = data => {
    if (data.$type === "message" || data.$type === "object") {
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
        .map((op) => {
        const operation = data.operations[op];
        return `${operation.description
            ? operation.description
                .split("\n")
                .map((line) => `  // ${line}`)
                .join("\n")
            : ""}
  rpc ${op}(${(operation.inMessage.data || [])
            .map((f) => (typeof f.type === "object" ? f.type.name : f.type))
            .join(", ")}) returns (${(operation.outMessage.data || [])
            .map((f) => (typeof f.type === "object" ? f.type.name : f.type))
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
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.grpc) {
                throw new Error("Argument exception");
            }
            const grpc = this.grpc;
            nschema.registerTarget({
                description: "Generate gRPC models for your nineschema definitions",
                language: "gRPC",
                name: "gRPC/object",
                type: "object",
                generate(config, thisNschema, target, context) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return baseGenerate(config, thisNschema, target, templates.object, grpc, context);
                    });
                }
            });
            nschema.registerTarget({
                description: "Generate gRPC services for your nineschema definitions",
                language: "gRPC",
                name: "gRPC/service",
                type: "service",
                generate(config, thisNschema, target, context) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return baseGenerate(config, thisNschema, target, templates.service, grpc, context);
                    });
                }
            });
            return true;
        });
    }
}
exports.NObject = NObject;
const obj = new NObject();
exports.default = obj;
