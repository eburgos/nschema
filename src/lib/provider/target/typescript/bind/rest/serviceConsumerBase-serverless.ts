import { messageType, TypeScriptContext } from "../..";
import {
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService
} from "../../../../../model";
import { findNonCollidingName } from "../../../../../utils";
import { typeName } from "../../helpers";
import { addSpace, getOperationDetails } from "./common";

function renderOperationsInterface(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  operations: { [name: string]: NSchemaRestOperation },
  name: string,
  namespace: string | undefined
) {
  return Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const { inMessage, outMessage } = getOperationDetails(operation, op);
      const contextVariable = findNonCollidingName(
        "context",
        (inMessage.data || []).map(d => d.name)
      );

      return `
  /**
   *${addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
  .map(par => {
    return `   * @param ${par.name} -${addSpace(
      (par.description || "").replace(/\n/g, "\n   * ")
    )}`;
  })
  .join("\n")}
   * @param ${contextVariable} - Operation context. Optional argument (The service always sends it but you may not implement it in your class)
   * @returns ${(outMessage.data || [])
     .map(d => {
       return (d.description || "").replace(/\n/g, "\n   * ");
     })
     .join(", ") || `{${messageType(nschema, context, false, outMessage)}}`}
   */
  ${op}(${(inMessage.data || [])
        .map(par => {
          return `${par.name}: ${typeName(
            par.type,
            nschema,
            namespace,
            name,
            context,
            true,
            true,
            true
          )}`;
        })
        .join(", ")}${
        (inMessage.data || []).length ? `, ` : ``
      }${contextVariable}: { event: any, context: any }): Promise<${messageType(
        nschema,
        context,
        true,
        outMessage
      )}>;`;
    })
    .join("\n");
}

function renderOperationsForClass(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  operations: { [name: string]: NSchemaRestOperation },
  name: string,
  namespace: string | undefined
) {
  const protecteds = Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const { inMessage, outMessage } = getOperationDetails(operation, op);

      return `
  /**
   *${addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
  .map(par => {
    return `   * @param ${par.name} -${addSpace(
      (par.description || "").replace(/\n/g, "\n   * ")
    )}`;
  })
  .join("\n")}
   * @param $ctx - Operation context
   * @returns ${(outMessage.data || [])
     .map(d => {
       return (d.description || "").replace(/\n/g, "\n   * ");
     })
     .join(", ") || `{${messageType(nschema, context, false, outMessage)}}`}
   */
  public abstract async ${op}(${(inMessage.data || [])
        .map(par => {
          return `${par.name}: ${typeName(
            par.type,
            nschema,
            namespace,
            name,
            context,
            true,
            true,
            true
          )}`;
        })
        .join(", ")}${
        (inMessage.data || []).length ? `, ` : ``
      }$ctx?: { event: any, context: any } /*: { event: any, context: any } */): Promise<${messageType(
        nschema,
        context,
        true,
        outMessage
      )}>;
`;
    })
    .join("\n");
  const abstracts = Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const { inMessage, outMessage } = getOperationDetails(operation, op);

      return `
  /**
   * Raw operation. This is what the service actually calls.
   *${addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
  .map(par => {
    return `   * @param ${par.name} -${addSpace(
      (par.description || "").replace(/\n/g, "\n   * ")
    )}`;
  })
  .join("\n")}
   * @returns ${(outMessage.data || [])
     .map(d => {
       return (d.description || "").replace(/\n/g, "\n   * ");
     })
     .join(", ") || `{${messageType(nschema, context, false, outMessage)}}`}
   */
  protected async $raw${op}(${(inMessage.data || [])
        .map(par => {
          return `${par.name}: ${typeName(
            par.type,
            nschema,
            namespace,
            name,
            context,
            true,
            true,
            true
          )}`;
        })
        .join(", ")}${
        (inMessage.data || []).length ? `, ` : ``
      }$ctx?: { event: any, context: any } /*: { event: any, context: any } */): Promise<${messageType(
        nschema,
        context,
        true,
        outMessage
      )}> {
    this.emit("callStarted", { name: "${op}", timestamp: new Date() });
    const result = await this.${op}(${(inMessage.data || [])
        .map(par => {
          return `${par.name}`;
        })
        .join(", ")}${(inMessage.data || []).length ? `, ` : ``}$ctx);
    this.emit("callCompleted", { name: "${op}", timestamp: new Date(), context: $ctx });
    return result;
  }`;
    })
    .join("\n");

  return `${protecteds}
${abstracts}`;
}

export function render(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  config: NSchemaRestService
) {
  if (!context.imports["{events}"]) {
    context.imports["{events}"] = {};
  }
  context.imports["{events}"].EventEmitter = true;

  return `export interface ${config.name} {
${renderOperationsInterface(
  nschema,
  context,
  config.operations,
  config.name,
  config.namespace
)}
  on(eventName: "callStarted", handler: (eventData: { name: string, timestamp: Date }) => any): this;
  on(eventName: "callCompleted", handler: (eventData: { name: string, timestamp: Date, result: any }) => any): this;
  on(eventName: "operationError", handler: (eventData: { name: string, timestamp: Date, error: Error }) => any): this;
  on(eventName: string, handler: () => any): this;
}

export abstract class ${config.name}Base extends EventEmitter implements ${
    config.name
  } {
${renderOperationsForClass(
  nschema,
  context,
  config.operations,
  config.name,
  config.namespace
)}
}
`;
}
