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

function renderConstructorForClass(
  _nschema: NSchemaInterface,
  _context: TypeScriptContext,
  _config: NSchemaRestService,
  operations: { [name: string]: NSchemaRestOperation }
) {
  return Object.keys(operations)
    .map(op => {
      const operation = operations[op];
      const {
        bodyArguments,
        headerArguments,
        inMessage,
        //        outMessage,
        route,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation, op);

      return `    expressApp.${getHttpVerb(
        operations[op].method || "get"
      ).toLowerCase()}("/${_config.routePrefix}${(route || op).replace(
        /\{([^\}]+?)\}/g,
        (_match, g1) => {
          return `:${g1}`;
        }
      )}", async (expressRequest, expressResponse) => {

${routeArguments
  .map(p => {
    return `      const input${p.name} = ${realTypeMap(
      p,
      `expressRequest.params${renderPropertyAccessor(p.name)}`
    )};
`;
  })
  .join("")}${queryArguments.map(p => {
        return `        const input${p.name} = ${realTypeMap(
          p,
          `expressRequest.query${renderPropertyAccessor(p.name)}`
        )};
        `;
      }).join(`,
        `)}${headerArguments.map(p => {
        return `const input${p.name} = ${realTypeMap(
          p,
          `expressRequest.header('${p.headerName || `X-${p.name}`}') || ""`
        )};`;
      }).join(`
        `)}${
        bodyArguments.length === 1
          ? `              const input${bodyArguments[0].name} = expressRequest.body;`
          : `${
              bodyArguments.length
                ? `${bodyArguments.map((p, idx) => {
                    return `const input${p.name} = expressRequest.body[${idx}];
`;
                  }).join(`
            `)}`
                : ``
            }`
      }

            try {
               expressResponse.status(200).json(await implementation.${op}(${(
        inMessage.data || []
      )
        .map(arg => `input${arg.name}`)
        .join(", ")}, { request: expressRequest, response: expressResponse }));
            }
            catch (exception: { statusCode: number, message: string, stack: string }) {
              expressResponse.status(exception.statusCode || 400).send(\`Bad request - $\{exception.message\}\`);
            }
        });`;
    })
    .join("\n");
}

function camelize(text: string) {
  text = text.replace(/[-_\s.]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
  return text.substr(0, 1).toLowerCase() + text.substr(1);
}

export function render(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  config: NSchemaRestService
) {
  if (!context.imports["{events}"]) {
    context.imports["{events}"] = {};
  }

  if (!context.imports["{express}"]) {
    context.imports["{express}"] = {};
  }
  context.imports["{express}"].Express = true;
  context.imports["{express}"].Request = true;
  context.imports["{express}"].Response = true;

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

export function ${camelize(
    config.name
  )}Controller(expressApp: Express, implementation: ${config.name}) {


${renderConstructorForClass(nschema, context, config, config.operations)}

}
`;
}
