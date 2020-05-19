"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.render = void 0;
const util_1 = require("util");
const _1 = require(".");
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const common_1 = require("./common");
function requestArgsType(method, encoding) {
    return `{
      data: ${method === "get"
        ? "undefined"
        : encoding === "json"
            ? `string`
            : `{ [name:string]: any } | undefined`};
      handleAs: string;
      headers: { [name: string]: string };
      method: "${method}";
      url: string;
      withCredentials?: boolean;
      mode: "navigate" | "same-origin" | "no-cors" | "cors";
    }`;
}
function isSingleDate(type) {
    if (utils_1.isPrimitiveTypeString(type)) {
        return type === "date";
    }
    else if (typeof type !== "string" &&
        type.name === "date" &&
        type.namespace === "") {
        if (!type.modifier) {
            return true;
        }
        else {
            const mods = util_1.isArray(type.modifier) ? type.modifier : [type.modifier];
            return mods.length === 1 && mods[0] === "option";
        }
    }
    return false;
}
function getValueOf(parameter) {
    const type = parameter.realType || parameter.type;
    if (isSingleDate(type)) {
        return `${parameter.name} instanceof Date? ${parameter.name}.getTime() : ${parameter.name}`;
    }
    return parameter.name;
}
function buildRequest(method, route, routePrefix, endpointPropertyName, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, encoding, context) {
    if (encoding === "querystring") {
        __1.enableImport(context, "qs");
    }
    return `{
      data: ${["get", "delete", "head"].indexOf(method.toLowerCase()) < 0 &&
        paramsInBody.length > 0
        ? encoding === "json"
            ? `JSON.stringify(${paramsInBody.length > 1 ? `[` : ``}${paramsInBody
                .map((argument) => {
                return getValueOf(argument);
            })
                .join(", ")}${paramsInBody.length > 1 ? `]` : ``})`
            : `qs.stringify({ ${paramsInBody
                .map((argument) => `${argument.name}: ${getValueOf(argument)}`)
                .join(", ")} })`
        : `undefined`},
      handleAs: "json",
      headers: {
        "Content-Type": "${encoding === "querystring"
        ? "application/x-www-form-urlencoded"
        : "application/json"}"${paramsInHeader.length
        ? `,
        ...{
          ${common_1.sortAlphabetically(paramsInHeader.map((argument) => {
            return utils_1.isOptional(argument)
                ? `...(typeof ${argument.name} !== "undefined")? { "${argument.headerName || `X-${argument.name}`}": \`\${${getValueOf(argument)}}\` } : {}`
                : `"${argument.headerName || `X-${argument.name}`}": \`\${${getValueOf(argument)}}\``;
        })).join(",\n          ")}
        }
      }`
        : `
      }`},
      method: "${method}",
      mode: "cors",
      url: \`\${this.${endpointPropertyName}}${routePrefix}${paramsInRoute.length
        ? `\${[${paramsInRoute
            .map((argument) => {
            return `{ key: \`${argument.name}\`, value: \`\${${getValueOf(argument)}}\`}`;
        })
            .join(", ")}].reduce((acc, next: { key: string; value: string }) => acc.split(\`{\${next.key}}\`).join(next.value), "${route}")}`
        : `${route}`}${paramsInQuery.length
        ? `?\${[${`${paramsInQuery
            .map((argument) => {
            const type = argument.realType || argument.type;
            if (argument.paramType === "query" &&
                !utils_1.isPrimitiveType(type) &&
                typeof type !== "string") {
                __1.enableImport(context, "qs");
                return `qs.stringify(${argument.name})`;
            }
            else {
                return `{ name: \`${argument.name}\`, value: ${getValueOf(argument)} }`;
            }
        })
            .join(`, `)}].filter((item: string | { name: string; value: string | number | undefined }) => (typeof item === "string")? item : (typeof(item.value) !== "undefined")).map((item: string | { name: string; value: string | number | undefined }) => typeof item === "string"? item : \`\${item.name}=\${encodeURIComponent(\`\${item.value}\`)}\`).join("&")}`}`
        : ``}\`
    }`;
}
const prepareImports = {
    [__1.RestClientStrategy.Default]: (context, target) => {
        const requestModule = target.$typeScriptRest
            ? target.$typeScriptRest.requestModule
            : "axios";
        if (!context.imports[requestModule]) {
            context.imports[requestModule] = {};
        }
        context.imports[requestModule].default = "request";
        return "Promise";
    }
};
const classHeader = {
    [__1.RestClientStrategy.Default]: (_context, config) => {
        return `/**
 *${config.description ? ` ${config.description}` : ""}
 *
 * @export
 * @class ${config.name}
 */`;
    }
};
const constructorPart = {
    [__1.RestClientStrategy.Default]: (endpointPropertyName, errorHandlerPropertyName, config) => {
        return `  /**
   * Base url for this http service
   */
  private readonly ${endpointPropertyName}: string /* :string */;

  public constructor(
    ${endpointPropertyName}: string /* :string */,
    private ${errorHandlerPropertyName}?: ${config.name}ErrorHandler
  ) {
    this.${endpointPropertyName} = ${endpointPropertyName};
  }
  /*::
  ${endpointPropertyName}: string;
  */
`;
    }
};
const requestOptionsPart = {
    [__1.RestClientStrategy.Default]: (method, route, routePrefix, endpointPropertyName, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, encoding, context) => {
        return `: ${requestArgsType(method, encoding)} = ${buildRequest(method, route, routePrefix, endpointPropertyName, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, encoding, context)};`;
    }
};
const bodyPart = {
    [__1.RestClientStrategy.Default]: (operation, method, _route, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, nschema, context, outMessage, operationName, optionsVarName, _endpointPropertyName, errorHandlerPropertyName) => {
        const responseVarName = utils_1.findNonCollidingName("response", [
            ...paramsInBody,
            ...paramsInHeader,
            ...paramsInQuery,
            ...paramsInRoute
        ].map((argument) => argument.name));
        return `try {
      const ${responseVarName} = await request.${method.toLowerCase()}${["delete"].indexOf(method.toLowerCase()) < 0
            ? `<${__1.messageType(nschema, context, outMessage)}>`
            : ``}(${optionsVarName}.url, ${["delete", "head", "get"].indexOf(method.toLowerCase()) < 0
            ? `${optionsVarName}.data, `
            : ``}{ ...${optionsVarName}${(outMessage.data || []).length ? "" : `, responseType: "text"`}${operation.cancellable
            ? `, cancelToken: typeof requestCancelOperation !== "undefined"? new request.CancelToken(requestCancelOperation) : undefined`
            : ""} 
});
      return ${responseVarName}.data;
    } catch (err) {
      if (this.${errorHandlerPropertyName} && this.${errorHandlerPropertyName}.${operationName}) {
        return this.${errorHandlerPropertyName}.${operationName}(err);
      } else {
        throw err;
      }
    }`;
    }
};
const errorHandlerPart = {
    [__1.RestClientStrategy.Default]: () => {
        return ``;
    }
};
function renderOperations(nschema, context, config, deferredType, restClientStrategy, endpointPropertyName, errorHandlerPropertyName) {
    const routePrefix = config.routePrefix || "";
    return `${Object.keys(config.operations)
        .map((operationName) => {
        const operation = config.operations[operationName];
        const { method, bodyArguments, headerArguments, inMessage, outMessage, route, routeArguments, queryArguments } = common_1.getOperationDetails(operation, operationName);
        const optionsVarName = utils_1.findNonCollidingName("options", (inMessage.data || []).map((argument) => argument.name));
        return `  /**
   *${(operation.description ? ` ${operation.description}` : "").replace(/\n/g, "\n   * ")}
${(inMessage.data || [])
            .map((par) => {
            return `   * @param ${par.name} -${common_1.addSpace((par.description || "")
                .split("\n")
                .map((doc) => doc.trim())
                .join("\n   * "))}
`;
        })
            .join("")}   * @returns${common_1.addSpace(((outMessage.data || []).length > 1 ? utils_1.wrap("[", "]") : common_1.identityStr)((outMessage.data || [])
            .map((argument) => {
            return (argument.description || "").trim();
        })
            .join(", ")))}
   */
  public async ${operationName}(${(inMessage.data || [])
            .map((par) => {
            return `${par.name}: ${helpers_1.typeName(par.type, nschema, config.namespace, config.name, context, true, true)}`;
        })
            .join(", ")}${operation.cancellable
            ? `, requestCancelOperation?: (cancelOperation: () => void) => void`
            : ""}): ${deferredType}<${__1.messageType(nschema, context, outMessage)}> /* :${deferredType}<${__1.messageType(nschema, context, outMessage)}> */ {
    const ${optionsVarName}${requestOptionsPart[restClientStrategy](method, route, routePrefix, endpointPropertyName, queryArguments, bodyArguments, headerArguments, routeArguments, inMessage.encoding || "json", context)}
    ${bodyPart[restClientStrategy](operation, method, route, queryArguments, bodyArguments, headerArguments, routeArguments, nschema, context, outMessage, operationName, optionsVarName, endpointPropertyName, errorHandlerPropertyName)}
  }
`;
    })
        .join("\n")}${!config.producerContexts
        ? ""
        : `
${Object.keys(config.producerContexts || {})
            .map((contextName) => {
            if (!config.producerContexts) {
                throw new Error("Invalid Argument");
            }
            const pContext = config.producerContexts[contextName];
            const description = pContext.description || "";
            pContext.operations.forEach((operationName) => {
                if (!config.operations[operationName]) {
                    throw new Error(`Unable to generate producer context ${contextName} for service ${config.namespace || ""} :: ${config.name} because it defines a non-existent operation ${operationName}.`);
                }
            });
            const contextOperations = Object.keys(config.operations)
                .filter((operationName) => pContext.operations.includes(operationName))
                .reduce((acc, next) => {
                acc[next] = config.operations[next];
                return acc;
            }, {});
            const operationArguments = pContext.arguments.map((arg) => {
                const { isValidType, lastType } = Object.keys(contextOperations).reduce((acc, cop) => {
                    const contextOperation = contextOperations[cop];
                    const operationArgument = (contextOperation.inMessage.data || []).find((operationArg) => operationArg.name === arg);
                    if (!operationArgument) {
                        throw new Error(`Unable to generate producer context ${contextName} for service ${config.namespace || ""} :: ${config.name} because all of it's operations don't have the ${arg} argument.`);
                    }
                    const argumentTypeName = helpers_1.typeName(operationArgument.realType || operationArgument.type, nschema, config.namespace, config.name, context, true, true);
                    if (acc.isValidType &&
                        (typeof acc.lastType === "undefined" ||
                            acc.lastType === argumentTypeName)) {
                        return {
                            isValidType: true,
                            lastType: argumentTypeName
                        };
                    }
                    else {
                        return { isValidType: false, lastType: undefined };
                    }
                }, { isValidType: true, lastType: undefined });
                if (!isValidType) {
                    throw new Error(`Unable to generate producer context ${contextName} for service ${config.namespace || ""} :: ${config.name} because all of it's operations don't have the same type for their ${arg} argument.`);
                }
                return {
                    name: arg,
                    type: lastType
                };
            });
            const replacerPropertyName = utils_1.findNonCollidingName(`contextReplacer`, Object.keys(contextOperations));
            return `  /*
   * ${description}
   */
  public ${contextName}(${operationArguments
                .map((arg) => `${arg.name}: ${arg.type}`)
                .join(", ")}) {
    return {
${Object.keys(contextOperations)
                .map((contextOperationName) => {
                const operation = contextOperations[contextOperationName];
                return `      ${contextOperationName}: (${(operation.inMessage.data || [])
                    .filter(({ name }) => !operationArguments.find((arg) => arg.name === name))
                    .map((arg) => `${arg.name}: ${helpers_1.typeName(arg.realType || arg.type, nschema, config.namespace, config.name, context, true, true)}`)
                    .join(", ")}) => this.${contextOperationName}(${(operation.inMessage.data || [])
                    .map((arg) => arg.name)
                    .join(", ")})`;
            })
                .join(",\n")}, ${replacerPropertyName}(${operationArguments
                .map((arg) => `new${arg.name}: ${arg.type}`)
                .join(", ")}) {
      ${operationArguments.map((arg) => `${arg.name} = new${arg.name}`).join(`;
        `)}

  }
    };
  }`;
        })
            .join("\n")}`}`;
}
function render(nschema, context, config, targetRaw) {
    if (!_1.isRestTarget(targetRaw)) {
        throw new Error("Invalid target for typescript rest");
    }
    const endpointPropertyName = utils_1.findNonCollidingName("endpointUrl", Object.keys(config.operations));
    const errorHandlerPropertyName = utils_1.findNonCollidingName("errorHandler", Object.keys(config.operations));
    const target = targetRaw;
    const restClientStrategy = target.$restClientStrategy || __1.RestClientStrategy.Default;
    const deferredType = prepareImports[restClientStrategy](context, target);
    return `${context.skipWrite
        ? ``
        : `${target.$header
            ? `/* ${target.$header} */
`
            : ""}${helpers_1.computeImportMatrix(config.namespace || "", target.$namespaceMapping || {}, context)}`}
export interface ${config.name}ErrorHandler {
${Object.keys(config.operations)
        .map((operationName) => {
        const operation = config.operations[operationName];
        const outMessage = operation.outMessage;
        return `  ${operationName}?(error: Error): ${deferredType}<${__1.messageType(nschema, context, outMessage)}>;`;
    })
        .join("\n")}
}

${classHeader[restClientStrategy](context, config)}
export class ${config.name} {
${constructorPart[restClientStrategy](endpointPropertyName, errorHandlerPropertyName, config)}
${renderOperations(nschema, context, config, deferredType, restClientStrategy, endpointPropertyName, errorHandlerPropertyName)}${errorHandlerPart[restClientStrategy]()}
}`;
}
exports.render = render;
