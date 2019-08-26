import { messageType, TypeScriptContext } from "../..";
import {
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService
} from "../../../../../model";
import { findNonCollidingName } from "../../../../../utils";
import { renderPropertyAccessor, typeName } from "../../helpers";
import {
  addSpace,
  getHttpVerb,
  getOperationDetails,
  realTypeMap
} from "./common";

function renderOperationsInterface(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  operations: { [name: string]: NSchemaRestOperation },
  name: string,
  namespace: string
) {
  return Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const { inMessage, outMessage } = getOperationDetails(operation, op);
      const contextVarName = findNonCollidingName(
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
   * @param ${contextVarName} - Operation context. Optional argument (The service always sends it but you may not implement it in your class)
   * @returns ${(outMessage.data || [])
     .map(d => {
       return (d.description || "").replace(/\n/g, "\n   * ");
     })
     .join(", ") || `{${messageType(nschema, context, false, outMessage)}}`}
   */
  ${op}(${(inMessage.data || [])
        .map(par => {
          return `${par.name}: ${typeName(
            par.realType || par.type,
            nschema,
            namespace,
            name,
            context,
            true,
            true
          )}`;
        })
        .join(", ")}${
        (inMessage.data || []).length ? `, ` : ``
      }${contextVarName}: { request: Request, response: Response }): Promise<${messageType(
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
      const contextVarName = findNonCollidingName(
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
   * @param ${contextVarName} - Operation context
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
            true
          )}`;
        })
        .join(", ")}${
        (inMessage.data || []).length ? `, ` : ``
      }${contextVarName}?: { request: Request, response: Response } /*: { request: Request, response: Response } */): Promise<${messageType(
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
      const contextVarName = findNonCollidingName(
        "context",
        (inMessage.data || []).map(d => d.name)
      );

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
            true
          )}`;
        })
        .join(", ")}${
        (inMessage.data || []).length ? `, ` : ``
      }${contextVarName}?: { request: Request, response: Response } /*: { request: Request, response: Response } */): Promise<${messageType(
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
        .join(", ")}${
        (inMessage.data || []).length ? `, ` : ``
      }${contextVarName});
    this.emit("callCompleted", { name: "${op}", timestamp: new Date(), context: ${contextVarName} });
    return result;
  }`;
    })
    .join("\n");

  return `${protecteds}
${abstracts}`;
}

function renderConstructorForClass(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  config: NSchemaRestService,
  operations: { [name: string]: NSchemaRestOperation }
) {
  return Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const {
        bodyArguments,
        headerArguments,
        inMessage,
        outMessage,
        route,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation, op);

      return `    webserver.add($verbs.${getHttpVerb(
        operations[op].method || "get"
      )}<${messageType(nschema, context, true, inMessage)}, ${messageType(
        nschema,
        context,
        true,
        outMessage
      )}>({
      route: '${route ||
        op.replace(/\{([^\}]+?)\}/g, (_match, g1) => {
          return `:${g1}`;
        })}',
      //contentType: 'application/json',
      inputMap: (req: Request): ${messageType(
        nschema,
        context,
        true,
        inMessage
      )} => {
        const input: any = {};
${routeArguments
  .map(p => {
    return `      input${renderPropertyAccessor(p.name)} = ${realTypeMap(
      p,
      `req.params${renderPropertyAccessor(p.name)}`
    )};
`;
  })
  .join("")}${queryArguments.map(p => {
        return `        input${renderPropertyAccessor(p.name)} = ${realTypeMap(
          p,
          `req.query${renderPropertyAccessor(p.name)}`
        )};
        `;
      }).join(`,
        `)}${headerArguments.map(p => {
        return `input${renderPropertyAccessor(p.name)} = ${realTypeMap(
          p,
          `req.header('${p.headerName || `X-${p.name}`}')`
        )};`;
      }).join(`
        `)}${
        bodyArguments.length === 1
          ? `              input${renderPropertyAccessor(
              bodyArguments[0].name
            )} = req.body;`
          : `${
              bodyArguments.length
                ? `${bodyArguments.map((p, idx) => {
                    return `input${renderPropertyAccessor(
                      p.name
                    )} = req.body[${idx}];
`;
                  }).join(`
            `)}`
                : ``
            }`
      }

            const result = input as ${messageType(
              nschema,
              context,
              true,
              inMessage
            )};
                return result;
            }
        }, (input: ${messageType(
          nschema,
          context,
          true,
          inMessage
        )}, request: Request, response: Response) => {
            return this.$raw${op}(${
        (inMessage.data || []).length === 1
          ? "input, "
          : (inMessage.data || [])
              .map(p => {
                return `input${renderPropertyAccessor(p.name)}, `;
              })
              .join("")
      } {request, response})
                .catch(
                    (e: ResponseError) => {
                        response.statusMessage = e.message;
                        response.status(e.statusCode || 500);
                        this.emit('operationError', { name: '${op}', timestamp: new Date(), error: e, response: response });
                        return undefined;
                    });
        })${config.routePrefix ? `, "${config.routePrefix}"` : ``});`;
    })
    .join("\n");
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

  if (!context.imports["{ninejs/modules/ninejs-server}"]) {
    context.imports["{ninejs/modules/ninejs-server}"] = {};
  }
  context.imports["{ninejs/modules/ninejs-server}"].NineJs = true;

  if (!context.imports["{ninejs/modules/webserver/WebServer}"]) {
    context.imports["{ninejs/modules/webserver/WebServer}"] = {};
  }
  context.imports["{ninejs/modules/webserver/WebServer}"].default = "WebServer";
  context.imports["{ninejs/modules/webserver/WebServer}"].Request = true;
  context.imports["{ninejs/modules/webserver/WebServer}"].Response = true;
  context.imports["{ninejs/modules/webserver/WebServer}"].ResponseError = true;

  if (!context.imports["{ninejs/modules/webserver/Rest}"]) {
    context.imports["{ninejs/modules/webserver/Rest}"] = {};
  }
  context.imports["{ninejs/modules/webserver/Rest}"]["*"] = "$verbs";
  context.imports["{ninejs/modules/webserver/Rest}"].get = true;
  context.imports["{ninejs/modules/webserver/Rest}"].post = true;

  return `export interface ${config.name} {
${renderOperationsInterface(
  nschema,
  context,
  config.operations,
  config.name,
  config.namespace || ""
)}
  on(eventName: "callStarted", handler: (eventData: { name: string, timestamp: Date }) => any): this;
  on(eventName: "callCompleted", handler: (eventData: { name: string, timestamp: Date, result: any }) => any): this;
  on(eventName: "operationError", handler: (eventData: { name: string, timestamp: Date, error: Error }) => any): this;
  on(eventName: string, handler: () => any): this;
}

export abstract class ${config.name}Base extends EventEmitter implements ${
    config.name
  } {

  constructor(private config: any, ninejs: NineJs, webserver: WebServer) {
    super();
${renderConstructorForClass(nschema, context, config, config.operations)}
  }
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
