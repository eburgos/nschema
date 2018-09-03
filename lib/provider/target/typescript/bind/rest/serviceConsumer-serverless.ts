import * as path from "path";
import {
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService
} from "../../../../../model";
import { renderPropertyAccessor } from "../../helpers";
import { messageType, TypeScriptContext } from "../../typescript";
import { getOperationDetails, realTypeMap } from "./common";
import { TypeScriptServerlessRest } from "./rest";

const serverlessReturnType = "{ statusCode: number, body: string }";

function renderOperations(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  operations: {
    [name: string]: NSchemaRestOperation;
  }
) {
  return Object.keys(operations)
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
      return `export async function ${op}(event: any, context: any, callback: (err: Error | undefined, r?: ${serverlessReturnType}) => void) {
  const input: any = {};
  try {
    const $body: any | undefined = (() => {
      if (event.body) {
        if ("string" === typeof event.body) {
          return JSON.parse(event.body);
        } else {
          return event.body;
        }
      }
      return undefined;
    })();
${routeArguments.map(p => {
        return `    input${renderPropertyAccessor(p.name)} = ${realTypeMap(
          p,
          `unescape(event.pathParameters${renderPropertyAccessor(p.name)})`
        )};
`;
      })}${queryArguments.map(p => {
        return `    input${renderPropertyAccessor(p.name)} = ${realTypeMap(
          p,
          `event.queryStringParameters${renderPropertyAccessor(p.name)}`
        )};`;
      })}
${headerArguments
        .map(p => {
          return `    input${renderPropertyAccessor(p.name)} = ${realTypeMap(
            p,
            `event.headers${renderPropertyAccessor(
              p.headerName || `X-${p.name}`
            )}`
          )};`;
        })
        .join("\n")}
${
        bodyArguments.length === 1
          ? `    input${renderPropertyAccessor(bodyArguments[0].name)} = $body;`
          : bodyArguments
              .map((p, idx) => {
                return `    input${renderPropertyAccessor(
                  p.name
                )} = $body[${idx}];`;
              })
              .join("\n")
      }

    const $req = input as ${messageType(nschema, context, true, inMessage)};

    const $result: ${messageType(
      nschema,
      context,
      true,
      outMessage
    )} = await $service.${op}(${
        inMessage.data.length === 1
          ? "$req, "
          : inMessage.data
              .map(p => {
                return `$req.${p.name}, `;
              })
              .join("")
      }{
      context,
      event
    });
    const response = {
      body: JSON.stringify($result),
      statusCode: context.statusCode || 200
    };
    callback(undefined, response);
  } catch (err) {
    if (typeof context.statusCode !== "undefined") {
    callback(undefined, {
      body: err.message,
      statusCode: context.statusCode
    });
    } else {
      console.error(err);
      callback(err, undefined);
    }
  }
}`;
    })
    .join("\n");
}

export function render(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  config: NSchemaRestService,
  target: TypeScriptServerlessRest
) {
  const implementationPath = path.relative(
    path.resolve(target.location, target.$serverless.yamlPath),
    path.resolve(target.location, target.$serverless.implementation)
  );
  if (!context.imports[implementationPath]) {
    context.imports[implementationPath] = {};
  }
  context.imports[implementationPath].default = "$ImplementationService";

  const basePath = `./${config.name}Base`;
  if (!context.imports[basePath]) {
    context.imports[basePath] = {};
  }
  context.imports[basePath][`${config.name}Base`] = true;
  return `
const $service: ${config.name}Base = new $ImplementationService();

${renderOperations(nschema, context, config.operations)}
`;
}
