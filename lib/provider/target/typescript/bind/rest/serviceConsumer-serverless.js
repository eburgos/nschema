"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const __1 = require("../..");
const helpers_1 = require("../../helpers");
const common_1 = require("./common");
const serverlessReturnType = "{ statusCode: number, body: string }";
function renderOperations(nschema, context, operations) {
    return Object.keys(operations)
        .map(op => {
        const operation = operations[op];
        const { bodyArguments, headerArguments, inMessage, outMessage, routeArguments, queryArguments } = common_1.getOperationDetails(operation, op);
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
            return `    input${helpers_1.renderPropertyAccessor(p.name)} = ${common_1.realTypeMap(p, `unescape(event.pathParameters${helpers_1.renderPropertyAccessor(p.name)})`)};
`;
        })}${queryArguments.map(p => {
            return `    input${helpers_1.renderPropertyAccessor(p.name)} = ${common_1.realTypeMap(p, `event.queryStringParameters${helpers_1.renderPropertyAccessor(p.name)}`)};`;
        })}
${headerArguments
            .map(p => {
            return `    input${helpers_1.renderPropertyAccessor(p.name)} = ${common_1.realTypeMap(p, `event.headers${helpers_1.renderPropertyAccessor(p.headerName || `X-${p.name}`)}`)};`;
        })
            .join("\n")}
${bodyArguments.length === 1
            ? `    input${helpers_1.renderPropertyAccessor(bodyArguments[0].name)} = $body;`
            : bodyArguments
                .map((p, idx) => {
                return `    input${helpers_1.renderPropertyAccessor(p.name)} = $body[${idx}];`;
            })
                .join("\n")}

    const $req = input as ${__1.messageType(nschema, context, true, inMessage)};

    const $result: ${__1.messageType(nschema, context, true, outMessage)} = await $service.${op}(${(inMessage.data || []).length === 1
            ? "$req, "
            : (inMessage.data || [])
                .map(p => {
                return `$req.${p.name}, `;
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
function render(nschema, context, config, target) {
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
