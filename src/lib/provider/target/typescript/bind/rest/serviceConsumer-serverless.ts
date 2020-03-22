import * as path from "path";
import { isServerlessTarget, TypeScriptServerlessRestTarget } from ".";
import { messageType, TypeScriptContext } from "../..";
import {
  NSchemaInterface,
  NSchemaRestOperation,
  NSchemaRestService,
  Target
} from "../../../../../model";
import { findNonCollidingName } from "../../../../../utils";
import { renderPropertyAccessor } from "../../helpers";
import { getOperationDetails, realTypeMap } from "./common";

const serverlessReturnType = "{ statusCode: number, body: string }";

function renderOperations(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  operations: {
    [name: string]: NSchemaRestOperation;
  }
) {
  return Object.keys(operations)
    .map(operationName => {
      const operation = operations[operationName];
      const {
        bodyArguments,
        headerArguments,
        inMessage,
        outMessage,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation, operationName);
      const bodyVarName = findNonCollidingName(
        "body",
        (inMessage.data || []).map(argument => argument.name)
      );
      return `export async function ${operationName}(event: any, context: any, callback: (err: Error | undefined, r?: ${serverlessReturnType}) => void) {
  const input: any = {};
  try {
    const ${bodyVarName}: any | undefined = (() => {
      if (event.body) {
        if ("string" === typeof event.body) {
          return JSON.parse(event.body);
        } else {
          return event.body;
        }
      }
      return undefined;
    })();
${routeArguments.map(argument => {
  return `    input${renderPropertyAccessor(argument.name)} = ${realTypeMap(
    argument,
    `unescape(event.pathParameters${renderPropertyAccessor(argument.name)})`
  )};
`;
})}${queryArguments.map(argument => {
        return `    input${renderPropertyAccessor(
          argument.name
        )} = ${realTypeMap(
          argument,
          `event.queryStringParameters${renderPropertyAccessor(argument.name)}`
        )};`;
      })}
${headerArguments
  .map(argument => {
    return `    input${renderPropertyAccessor(argument.name)} = ${realTypeMap(
      argument,
      `event.headers${renderPropertyAccessor(
        argument.headerName || `X-${argument.name}`
      )}`
    )};`;
  })
  .join("\n")}
${
  bodyArguments.length === 1
    ? `    input${renderPropertyAccessor(
        bodyArguments[0].name
      )} = ${bodyVarName};`
    : bodyArguments
        .map((argument, index) => {
          return `    input${renderPropertyAccessor(
            argument.name
          )} = ${bodyVarName}[${index}];`;
        })
        .join("\n")
}

    const $req = input as ${messageType(nschema, context, true, inMessage)};

    const $result: ${messageType(
      nschema,
      context,
      true,
      outMessage
    )} = await $service.${operationName}(${
        (inMessage.data || []).length === 1
          ? "$req, "
          : (inMessage.data || [])
              .map(argument => {
                return `$req.${argument.name}, `;
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
  targetRaw: Target
) {
  if (!isServerlessTarget(targetRaw)) {
    throw new Error("Invalid target for typescript rest serverless");
  }
  const target: TypeScriptServerlessRestTarget = targetRaw;

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
