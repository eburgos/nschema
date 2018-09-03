import {
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService
} from "../../../../../model";
import typescript, { messageType, TypeScriptContext } from "../../typescript";
import { addSpace, getOperationDetails, realTypeMap } from "./common";
import { TypeScriptServerlessRest } from "./rest";

function renderOperationsInterface(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  operations: { [name: string]: NSchemaRestOperation }
) {
  return Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const { inMessage, outMessage } = getOperationDetails(operation);

      return `
  /**
   *${addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${inMessage.data
        .map(par => {
          return `   * @param ${par.name} -${addSpace(
            (par.description || "").replace(/\n/g, "\n   * ")
          )}`;
        })
        .join("\n")}
   * @param $ctx - Operation context. Optional argument (The service always sends it but you may not implement it in your class)
   * @returns ${outMessage.data
     .map(d => {
       return (d.description || "").replace(/\n/g, "\n   * ");
     })
     .join(", ") || `{${messageType(nschema, context, false, outMessage)}}`}
   */
  ${op}(${inMessage.data
        .map((par, $i) => {
          return `${par.name}: ${typescript.typeName(
            par.type,
            nschema,
            "",
            "",
            context,
            true
          )}`;
        })
        .join(", ")}${
        inMessage.data.length ? `, ` : ``
      }$ctx: { event: any, context: any }): Promise<${messageType(
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
  operations: { [name: string]: NSchemaRestOperation }
) {
  const protecteds = Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const {
        method,
        bodyArguments,
        headerArguments,
        inMessage,
        outMessage,
        route,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation);

      return `
  /**
   *${addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${inMessage.data
        .map(par => {
          return `   * @param ${par.name} -${addSpace(
            (par.description || "").replace(/\n/g, "\n   * ")
          )}`;
        })
        .join("\n")}
   * @param $ctx - Operation context
   * @returns ${outMessage.data
     .map(d => {
       return (d.description || "").replace(/\n/g, "\n   * ");
     })
     .join(", ") || `{${messageType(nschema, context, false, outMessage)}}`}
   */
  public abstract async ${op}(${inMessage.data
        .map((par, $i) => {
          return `${par.name}: ${typescript.typeName(
            par.type,
            nschema,
            "",
            "",
            context,
            true
          )}`;
        })
        .join(", ")}${
        inMessage.data.length ? `, ` : ``
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
      const {
        method,
        bodyArguments,
        headerArguments,
        inMessage,
        outMessage,
        route,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation);

      return `
  /**
   * Raw operation. This is what the service actually calls.
   *${addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${inMessage.data
        .map(par => {
          return `   * @param ${par.name} -${addSpace(
            (par.description || "").replace(/\n/g, "\n   * ")
          )}`;
        })
        .join("\n")}
   * @returns ${outMessage.data
     .map(d => {
       return (d.description || "").replace(/\n/g, "\n   * ");
     })
     .join(", ") || `{${messageType(nschema, context, false, outMessage)}}`}
   */
  protected async $raw${op}(${inMessage.data
        .map((par, $i) => {
          return `${par.name}: ${typescript.typeName(
            par.type,
            nschema,
            "",
            "",
            context,
            true
          )}`;
        })
        .join(", ")}${
        inMessage.data.length ? `, ` : ``
      }$ctx?: { event: any, context: any } /*: { event: any, context: any } */): Promise<${messageType(
        nschema,
        context,
        true,
        outMessage
      )}> {
    this.emit("callStarted", { name: "${op}", timestamp: new Date() });
    const result = await this.${op}(${inMessage.data
        .map((par, $i) => {
          return `${par.name}`;
        })
        .join(", ")}${inMessage.data.length ? `, ` : ``}$ctx);
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
  config: NSchemaRestService,
  target: TypeScriptServerlessRest
) {
  if (!context.imports["{events}"]) {
    context.imports["{events}"] = {};
  }
  context.imports["{events}"].EventEmitter = true;

  return `export interface ${config.name} {
${renderOperationsInterface(nschema, context, config.operations)}
  on(eventName: "callStarted", handler: (eventData: { name: string, timestamp: Date }) => any): this;
  on(eventName: "callCompleted", handler: (eventData: { name: string, timestamp: Date, result: any }) => any): this;
  on(eventName: "operationError", handler: (eventData: { name: string, timestamp: Date, error: Error }) => any): this;
  on(eventName: string, handler: () => any): this;
}

export abstract class ${config.name}Base extends EventEmitter implements ${
    config.name
  } {
${renderOperationsForClass(nschema, context, config.operations)}
}
`;
}
