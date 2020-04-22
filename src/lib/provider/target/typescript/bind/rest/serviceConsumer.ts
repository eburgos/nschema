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
    .map((operationName) => {
      const operation = operations[operationName];
      const { inMessage, outMessage } = getOperationDetails(
        operation,
        operationName
      );
      const contextVarName = findNonCollidingName(
        "context",
        (inMessage.data || []).map((argument) => argument.name)
      );

      return `
  /**
   *${addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
  .map((par) => {
    return `   * @param ${par.name} -${addSpace(
      (par.description || "").replace(/\n/g, "\n   * ")
    )}`;
  })
  .join("\n")}
   * @param ${contextVarName} - Operation context. Optional argument (The service always sends it but you may not implement it in your class)
   * @returns ${
     (outMessage.data || [])
       .map((argument) => {
         return (argument.description || "").replace(/\n/g, "\n   * ");
       })
       .join(", ") || `{${messageType(nschema, context, outMessage)}}`
   }
   */
  ${operationName}(${(inMessage.data || [])
        .map((par) => {
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
        outMessage
      )}>;`;
    })
    .join("\n");
}

function renderConstructorForClass(
  _nschema: NSchemaInterface,
  context: TypeScriptContext,
  _config: NSchemaRestService,
  operations: { [name: string]: NSchemaRestOperation }
) {
  return Object.keys(operations)
    .map((operationName) => {
      const operation = operations[operationName];
      const {
        bodyArguments,
        headerArguments,
        inMessage,
        //        outMessage,
        route,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation, operationName);

      if (
        typeof operation.inMessage.encoding === "undefined" ||
        operation.inMessage.encoding === "json"
      ) {
        if (!context.imports["{body-parser}"]) {
          context.imports["{body-parser}"] = {};
        }
        context.imports["{body-parser}"]["*"] = "bodyParser";
      }

      if (operation.cors) {
        if (!context.imports["{cors}"]) {
          context.imports["{cors}"] = {};
        }
        context.imports["{cors}"]["default"] = "cors";
      }

      return `    expressRouter.${getHttpVerb(
        operations[operationName].method || "get"
      ).toLowerCase()}("/${_config.routePrefix}${(
        route || operationName
      ).replace(/\{([^}]+?)\}/g, (_match, firstGroup) => {
        return `:${firstGroup}`;
      })}"${operation.cors ? `, cors()` : ""}, bodyParser.json(${
        operation.requestLimit ? `{ limit: "${operation.requestLimit}" }` : ""
      }), async (expressRequest, expressResponse) => {

${routeArguments
  .map((argument) => {
    return `      const input${argument.name} = ${realTypeMap(
      context,
      argument,
      `expressRequest.params${renderPropertyAccessor(argument.name)}`
    )};
`;
  })
  .join("")}${queryArguments.map((argument) => {
        return `        const input${argument.name} = ${realTypeMap(
          context,
          argument,
          `expressRequest.query${renderPropertyAccessor(argument.name)}`
        )};
        `;
      }).join(`
        `)}${headerArguments.map((argument) => {
        return `const input${argument.name} = ${realTypeMap(
          context,
          argument,
          `expressRequest.header('${
            argument.headerName || `X-${argument.name}`
          }') || ""`
        )};`;
      }).join(`
        `)}${
        bodyArguments.length === 1
          ? `              const input${bodyArguments[0].name} = expressRequest.body;`
          : `${
              bodyArguments.length
                ? `${bodyArguments.map((argument, index) => {
                    return `const input${argument.name} = expressRequest.body[${index}];
`;
                  }).join(`
            `)}`
                : ``
            }`
      }

            try {
               expressResponse.status(200).json(await implementation.${operationName}(${(
        inMessage.data || []
      )
        .map((arg) => `input${arg.name}`)
        .join(", ")}, { request: expressRequest, response: expressResponse }));
            }
            catch (exception: { statusCode: number, message: string, stack: string }) {
              if (exception.statusCode) {
                expressResponse.status(exception.statusCode).send(exception.message);
              }
              else {
                expressResponse.status(400).send(\`Bad request - $\{exception.message}\`);
              }
            }
        });`;
    })
    .join("\n");
}

function camelize(text: string) {
  text = text.replace(/[-_\s.]+(.)?/g, (_, captureGroup) =>
    captureGroup ? captureGroup.toUpperCase() : ""
  );
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
  context.imports["{express}"].Router = true;
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
}

export function ${camelize(
    config.name
  )}Controller(expressRouter: Router, implementation: ${config.name}) {


${renderConstructorForClass(nschema, context, config, config.operations)}

}
`;
}
