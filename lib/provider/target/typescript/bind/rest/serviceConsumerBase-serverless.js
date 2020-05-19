"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const common_1 = require("./common");
function renderOperationsInterface(nschema, context, operations, name, namespace) {
    return Object.keys(operations)
        .map((operationName) => {
        const operation = operations[operationName];
        const { inMessage, outMessage } = common_1.getOperationDetails(operation, operationName);
        const contextVariable = utils_1.findNonCollidingName("context", (inMessage.data || []).map((argument) => argument.name));
        return `
  /**
   *${common_1.addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
            .map((par) => {
            return `   * @param ${par.name} -${common_1.addSpace((par.description || "").replace(/\n/g, "\n   * "))}`;
        })
            .join("\n")}
   * @param ${contextVariable} - Operation context. Optional argument (The service always sends it but you may not implement it in your class)
   * @returns ${(outMessage.data || [])
            .map((argument) => {
            return (argument.description || "").replace(/\n/g, "\n   * ");
        })
            .join(", ") || `{${__1.messageType(nschema, context, outMessage)}}`}
   */
  ${operationName}(${(inMessage.data || [])
            .map((par) => {
            return `${par.name}: ${helpers_1.typeName(par.type, nschema, namespace, name, context, true, true)}`;
        })
            .join(", ")}${(inMessage.data || []).length ? `, ` : ``}${contextVariable}: { event: any, context: any }): Promise<${__1.messageType(nschema, context, outMessage)}>;`;
    })
        .join("\n");
}
function renderOperationsForClass(nschema, context, operations, name, namespace) {
    const protecteds = Object.keys(operations)
        .map((operationName) => {
        const operation = operations[operationName];
        const { inMessage, outMessage } = common_1.getOperationDetails(operation, operationName);
        return `
  /**
   *${common_1.addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
            .map((par) => {
            return `   * @param ${par.name} -${common_1.addSpace((par.description || "").replace(/\n/g, "\n   * "))}`;
        })
            .join("\n")}
   * @param $ctx - Operation context
   * @returns ${(outMessage.data || [])
            .map((argument) => {
            return (argument.description || "").replace(/\n/g, "\n   * ");
        })
            .join(", ") || `{${__1.messageType(nschema, context, outMessage)}}`}
   */
  public abstract async ${operationName}(${(inMessage.data || [])
            .map((par) => {
            return `${par.name}: ${helpers_1.typeName(par.type, nschema, namespace, name, context, true, true)}`;
        })
            .join(", ")}${(inMessage.data || []).length ? `, ` : ``}$ctx?: { event: any, context: any } /*: { event: any, context: any } */): Promise<${__1.messageType(nschema, context, outMessage)}>;
`;
    })
        .join("\n");
    const abstracts = Object.keys(operations)
        .map((operationName) => {
        const operation = operations[operationName];
        const { inMessage, outMessage } = common_1.getOperationDetails(operation, operationName);
        return `
  /**
   * Raw operation. This is what the service actually calls.
   *${common_1.addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
            .map((par) => {
            return `   * @param ${par.name} -${common_1.addSpace((par.description || "").replace(/\n/g, "\n   * "))}`;
        })
            .join("\n")}
   * @returns ${(outMessage.data || [])
            .map((argument) => {
            return (argument.description || "").replace(/\n/g, "\n   * ");
        })
            .join(", ") || `{${__1.messageType(nschema, context, outMessage)}}`}
   */
  protected async $raw${operationName}(${(inMessage.data || [])
            .map((par) => {
            return `${par.name}: ${helpers_1.typeName(par.type, nschema, namespace, name, context, true, true)}`;
        })
            .join(", ")}${(inMessage.data || []).length ? `, ` : ``}$ctx?: { event: any, context: any } /*: { event: any, context: any } */): Promise<${__1.messageType(nschema, context, outMessage)}> {
    this.emit("callStarted", { name: "${operationName}", timestamp: new Date() });
    const result = await this.${operationName}(${(inMessage.data || [])
            .map((par) => {
            return `${par.name}`;
        })
            .join(", ")}${(inMessage.data || []).length ? `, ` : ``}$ctx);
    this.emit("callCompleted", { name: "${operationName}", timestamp: new Date(), context: $ctx });
    return result;
  }`;
    })
        .join("\n");
    return `${protecteds}
${abstracts}`;
}
function render(nschema, context, config) {
    if (!context.imports["{events}"]) {
        context.imports["{events}"] = {};
    }
    context.imports["{events}"].EventEmitter = true;
    return `export interface ${config.name} {
${renderOperationsInterface(nschema, context, config.operations, config.name, config.namespace)}
  on(eventName: "callStarted", handler: (eventData: { name: string, timestamp: Date }) => any): this;
  on(eventName: "callCompleted", handler: (eventData: { name: string, timestamp: Date, result: any }) => any): this;
  on(eventName: "operationError", handler: (eventData: { name: string, timestamp: Date, error: Error }) => any): this;
  on(eventName: string, handler: () => any): this;
}

export abstract class ${config.name}Base extends EventEmitter implements ${config.name} {
${renderOperationsForClass(nschema, context, config.operations, config.name, config.namespace)}
}
`;
}
exports.render = render;
