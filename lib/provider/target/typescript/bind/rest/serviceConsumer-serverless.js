"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const _1 = require(".");
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const common_1 = require("./common");
const serverlessReturnType = "{ statusCode: number, body: string }";
function renderOperations(nschema, context, operations) {
    return Object.keys(operations)
        .map((operationName) => {
        const operation = operations[operationName];
        const { bodyArguments, headerArguments, inMessage, outMessage, routeArguments, queryArguments } = common_1.getOperationDetails(operation, operationName);
        const bodyVarName = utils_1.findNonCollidingName("body", (inMessage.data || []).map((argument) => argument.name));
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
${routeArguments.map((argument) => {
            return `    input${helpers_1.renderPropertyAccessor(argument.name)} = ${common_1.realTypeMap(context, argument, `unescape(event.pathParameters${helpers_1.renderPropertyAccessor(argument.name)})`)};
`;
        })}${queryArguments.map((argument) => {
            return `    input${helpers_1.renderPropertyAccessor(argument.name)} = ${common_1.realTypeMap(context, argument, `event.queryStringParameters${helpers_1.renderPropertyAccessor(argument.name)}`)};`;
        })}
${headerArguments
            .map((argument) => {
            return `    input${helpers_1.renderPropertyAccessor(argument.name)} = ${common_1.realTypeMap(context, argument, `event.headers${helpers_1.renderPropertyAccessor(argument.headerName || `X-${argument.name}`)}`)};`;
        })
            .join("\n")}
${bodyArguments.length === 1
            ? `    input${helpers_1.renderPropertyAccessor(bodyArguments[0].name)} = ${bodyVarName};`
            : bodyArguments
                .map((argument, index) => {
                return `    input${helpers_1.renderPropertyAccessor(argument.name)} = ${bodyVarName}[${index}];`;
            })
                .join("\n")}

    const $req = input as ${__1.messageType(nschema, context, inMessage)};

    const $result: ${__1.messageType(nschema, context, outMessage)} = await $service.${operationName}(${(inMessage.data || []).length === 1
            ? "$req, "
            : (inMessage.data || [])
                .map((argument) => {
                return `$req.${argument.name}, `;
            })
                .join("")}{
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
function render(nschema, context, config, targetRaw) {
    if (!_1.isServerlessTarget(targetRaw)) {
        throw new Error("Invalid target for typescript rest serverless");
    }
    const target = targetRaw;
    const implementationPath = path.relative(path.resolve(target.location, target.$serverless.yamlPath), path.resolve(target.location, target.$serverless.implementation));
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
exports.render = render;
