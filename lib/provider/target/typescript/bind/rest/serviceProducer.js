"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const _1 = require(".");
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const common_1 = require("./common");
function requestArgsType(method) {
    return `{
      data: any | undefined;
      handleAs: string;
      headers: {[name: string]: string };
      method: "${method}";
      url: string;
    }`;
}
function isSingleDate(t) {
    if (helpers_1.isPrimitiveTypeString(t)) {
        return t === "date";
    }
    else if (typeof t !== "string" &&
        (t.name === "date" && t.namespace === "")) {
        if (!t.modifier) {
            return true;
        }
        else {
            const mods = util_1.isArray(t.modifier) ? t.modifier : [t.modifier];
            return mods.length === 1 && mods[0] === "option";
        }
    }
    return false;
}
function getValueOf(p) {
    const type = p.realType || p.type;
    if (isSingleDate(type)) {
        return `${p.name} instanceof Date? ${p.name}.getTime() : ${p.name}`;
    }
    return p.name;
}
function buildRequest(method, route, routePrefix, endpointPropertyName, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, encoding, context) {
    if (encoding === "querystring") {
        if (!context.imports["{qs}"]) {
            context.imports["{qs}"] = {};
        }
        context.imports["{qs}"]["*"] = "qs";
    }
    return `{
      data: ${["get", "delete", "head"].indexOf(method.toLowerCase()) < 0 &&
        paramsInBody.length > 0
        ? encoding === "json"
            ? `JSON.stringify(${paramsInBody.length > 1 ? `[` : ``}${paramsInBody
                .map(d => {
                return getValueOf(d);
            })
                .join(", ")}${paramsInBody.length > 1 ? `]` : ``})`
            : `qs.stringify({${paramsInBody.map(p => `${p.name}: ${getValueOf(p)}`)}})`
        : `undefined`},
      handleAs: "json",
      headers: {
        "Content-Type": "${encoding === "querystring"
        ? "application/x-www-form-urlencoded"
        : "application/json"}"${paramsInHeader.length
        ? `,
        ...{
          ${common_1.sortAlphabetically(paramsInHeader.map(p => {
            return __1.isOptional(p)
                ? `...(typeof ${p.name} !== "undefined")? { "${p.headerName ||
                    `X-${p.name}`}": \`\${${getValueOf(p)}}\` } : {}`
                : `"${p.headerName || `X-${p.name}`}": \`\${${getValueOf(p)}}\``;
        })).join(",\n          ")}
        }}`
        : `
      }`},
      method: "${method}",
      url: \`\${this.${endpointPropertyName}}${routePrefix}${paramsInRoute.length
        ? `\${[${paramsInRoute
            .map(p => {
            return `{ key: \`${p.name}\`, value: \`\${${getValueOf(p)}}\`}`;
        })
            .join(", ")}].reduce((acc, next: { key: string; value: string; }) => acc.split(\`{\${next.key}}\`).join(next.value), "${route}")}`
        : `${route}`}${paramsInQuery.length
        ? `?\${[${`${paramsInQuery
            .map(p => {
            return `{ name: \`${p.name}\`, value: ${getValueOf(p)} }`;
        })
            .join(`, `)}].filter(item => typeof(item.value) !== "undefined").map(item => \`\${item.name}=\${encodeURIComponent(\`\${item.value}\`)}\`).join("&")}`}`
        : ``}\`
    }`;
}
const prepareImports = {
    [__1.RestClientStrategy.Angular2]: (context, _target) => {
        if (!context.imports["@angular/core"]) {
            context.imports["@angular/core"] = {};
        }
        context.imports["@angular/core"].Injectable = true;
        if (!context.imports["@angular/http"]) {
            context.imports["@angular/http"] = {};
        }
        context.imports["@angular/http"].Http = false;
        context.imports["@angular/http"].Response = false;
        context.imports["@angular/http"].Headers = false;
        context.imports["@angular/http"].RequestOptions = false;
        context.imports["@angular/http"].URLSearchParams = false;
        if (!context.imports["rxjs/Rx"]) {
            context.imports["rxjs/Rx"] = {};
        }
        context.imports["rxjs/Rx"].Observable = false;
        return "Observable";
    },
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
    [__1.RestClientStrategy.Angular2]: (context) => {
        if (!context.imports["rxjs/add/operator/map"]) {
            context.imports["rxjs/add/operator/map"] = {};
        }
        if (!context.imports["rxjs/add/operator/catch"]) {
            context.imports["rxjs/add/operator/catch"] = {};
        }
        return `
const $toJson = (res: Response) => {
  const body = res.json();
  return body;
};

@Injectable()`;
    },
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
    [__1.RestClientStrategy.Angular2]: (endpointPropertyName) => {
        return `  /**
   * Base url for this http service
   */
  ${endpointPropertyName}: string;

  public constructor(private http: Http) {
  }
`;
    },
    [__1.RestClientStrategy.Default]: (endpointPropertyName, errorHandlerPropertyName, config) => {
        return `  /**
   * Base url for this http service
   */
  private readonly ${endpointPropertyName}: string /* :string */;

  public constructor(${endpointPropertyName}: string /* :string */, private ${errorHandlerPropertyName}?: ${config.name}ErrorHandler) {
      this.${endpointPropertyName} = ${endpointPropertyName};
  }
  /*::
  ${endpointPropertyName}: string;
  */
`;
    }
};
const requestOptionsPart = {
    [__1.RestClientStrategy.Angular2]: (_method, _route, _routePrefix, _endpointPropertyName, _paramsInQuery, _paramsInBody, _paramsInHeader, _paramsInRoute) => {
        return ` = new RequestOptions();`;
    },
    [__1.RestClientStrategy.Default]: (method, route, routePrefix, endpointPropertyName, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, encoding, context) => {
        return `: ${requestArgsType(method)} = ${buildRequest(method, route, routePrefix, endpointPropertyName, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, encoding, context)};`;
    }
};
const bodyPart = {
    [__1.RestClientStrategy.Angular2]: (method, route, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, _nschema, _context, _outMessage, op, optionsVarName, endpointPropertyName) => {
        return `${paramsInQuery.length
            ? `        let $queryParams: URLSearchParams = new URLSearchParams();
    ${paramsInQuery.map(p => {
                return `        if (typeof(${p.name}) !== undefined) {
                $queryParams.set("${p.name}", ${p.name}.toString());
            }`;
            })}        ${optionsVarName}.params = $queryParams;`
            : ``}
    ${optionsVarName}.headers =  new Headers({
      "Content-Type": "application/json",
      ${paramsInHeader
            .map(p => {
            return `"${p.headerName || `X-${p.name}`}": ${p.name}`;
        })
            .join(",\n                ")}
    });
${["get", "delete", "head"].indexOf(method.toLowerCase()) < 0
            ? `${paramsInBody.length
                ? `
let $body = JSON.stringify(${paramsInBody.length > 1 ? `[` : ``}${paramsInBody
                    .map(d => {
                    return d.name;
                })
                    .join(", ")}${paramsInBody.length > 1 ? `]` : ``});`
                : `let $body = "";`}`
            : ``}

    return this.http.${method.toLowerCase()}(this.${endpointPropertyName} + [${paramsInRoute
            .map(p => {
            return `\`${p.name}\``;
        })
            .join(", ")}].reduce((acc, next: string) => acc.split(\`{\${next}}\`).join(next), "${route}"),${["get", "delete", "head"].indexOf(method.toLowerCase()) < 0
            ? ` $body,`
            : ``} ${optionsVarName})
                    .map($toJson)
                    .catch((error) => {
                        return this.$errorHandler(error, "${op}");
                    });`;
    },
    [__1.RestClientStrategy.Default]: (method, _route, _paramsInQuery, _paramsInBody, _paramsInHeader, _paramsInRoute, nschema, context, outMessage, op, optionsVarName, _endpointPropertyName, errorHandlerPropertyName) => {
        const responseVarName = utils_1.findNonCollidingName("response", [
            ..._paramsInBody,
            ..._paramsInHeader,
            ..._paramsInQuery,
            ..._paramsInRoute
        ].map(p => p.name));
        return `try {
      const ${responseVarName} = await request.${method.toLowerCase()}${["delete"].indexOf(method.toLowerCase()) < 0
            ? `<${__1.messageType(nschema, context, false, outMessage)}>`
            : ``}(${optionsVarName}.url, ${["delete", "head", "get"].indexOf(method.toLowerCase()) < 0
            ? `${optionsVarName}.data, `
            : ``}${optionsVarName});
      return ${responseVarName}.data;
    }
    catch (err) {
      if (this.${errorHandlerPropertyName} && this.${errorHandlerPropertyName}.${op}) {
        return this.${errorHandlerPropertyName}.${op}(err);
      }
      else {
        throw err;
      }
    }`;
    }
};
const errorHandlerPart = {
    [__1.RestClientStrategy.Angular2]: () => {
        return `$errorHandler (error:any, operationName: string) {
        return Observable.throw(error.json().error || "Server error");
    };`;
    },
    [__1.RestClientStrategy.Default]: () => {
        return ``;
    }
};
function renderOperations(nschema, context, config, deferredType, restClientStrategy, endpointPropertyName, errorHandlerPropertyName) {
    const routePrefix = config.routePrefix || "";
    return `${Object.keys(config.operations)
        .map(op => {
        const operation = config.operations[op];
        const { method, bodyArguments, headerArguments, inMessage, outMessage, route, routeArguments, queryArguments } = common_1.getOperationDetails(operation, op);
        if (method === "get" && bodyArguments.length) {
            throw new Error(`Service "${config.name}" : operation "${op}" has method GET and body parameters "${bodyArguments
                .map(d => d.name)
                .join("\n")}". Fix this to continue.`);
        }
        const optionsVarName = utils_1.findNonCollidingName("options", (inMessage.data || []).map(m => m.name));
        return `  /**
   *${(operation.description ? ` ${operation.description}` : "").replace(/\n/g, "\n   * ")}
${(inMessage.data || [])
            .map(par => {
            return `   * @param ${par.name} -${common_1.addSpace((par.description || "")
                .split("\n")
                .map((doc) => doc.trim())
                .join("\n   * "))}
`;
        })
            .join("")}   * @returns${common_1.addSpace(((outMessage.data || []).length > 1 ? utils_1.wrap("[", "]") : common_1.identityStr)((outMessage.data || [])
            .map(d => {
            return (d.description || "").trim();
        })
            .join(", ")))}
   */
  public async ${op}(${(inMessage.data || [])
            .map(par => {
            return `${par.name}: ${helpers_1.typeName(par.type, nschema, config.namespace, config.name, context, true, true)}`;
        })
            .join(", ")}): ${deferredType}<${__1.messageType(nschema, context, false, outMessage)}> /* :${deferredType}<${__1.messageType(nschema, context, false, outMessage)}> */ {
    const ${optionsVarName}${requestOptionsPart[restClientStrategy](method, route, routePrefix, endpointPropertyName, queryArguments, bodyArguments, headerArguments, routeArguments, inMessage.encoding || "json", context)}
    ${bodyPart[restClientStrategy](method, route, queryArguments, bodyArguments, headerArguments, routeArguments, nschema, context, outMessage, op, optionsVarName, endpointPropertyName, errorHandlerPropertyName)}
  }
`;
    })
        .join("\n")}${!config.producerContexts
        ? ""
        : `
  ${Object.keys(config.producerContexts || {})
            .map(contextName => {
            if (!config.producerContexts) {
                throw new Error("Invalid Argument");
            }
            const pContext = config.producerContexts[contextName];
            const description = pContext.description || "";
            pContext.operations.forEach(op => {
                if (!config.operations[op]) {
                    throw new Error(`Unable to generate producer context ${contextName} for service ${config.namespace ||
                        ""} :: ${config.name} because it defines a non-existent operation ${op}.`);
                }
            });
            const contextOperations = Object.keys(config.operations)
                .filter(k => pContext.operations.includes(k))
                .reduce((acc, next) => {
                acc[next] = config.operations[next];
                return acc;
            }, {});
            const operationArguments = pContext.arguments.map(arg => {
                const { isValidType, lastType } = Object.keys(contextOperations).reduce((acc, cop) => {
                    const contextOperation = contextOperations[cop];
                    const operationArgument = (contextOperation.inMessage.data || []).find(operationArg => operationArg.name === arg);
                    if (!operationArgument) {
                        throw new Error(`Unable to generate producer context ${contextName} for service ${config.namespace ||
                            ""} :: ${config.name} because all of it's operations don't have the ${arg} argument.`);
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
                    throw new Error(`Unable to generate producer context ${contextName} for service ${config.namespace ||
                        ""} :: ${config.name} because all of it's operations don't have the same type for their ${arg} argument.`);
                }
                return {
                    name: arg,
                    type: lastType
                };
            });
            return `/*
   * ${description}
   */
  public ${contextName}(${operationArguments
                .map(arg => `${arg.name}: ${arg.type}`)
                .join(", ")}) {
    return {
${Object.keys(contextOperations)
                .map(op => {
                const operation = contextOperations[op];
                return `      ${op}: (${(operation.inMessage.data || [])
                    .filter(({ name }) => !operationArguments.find(arg => arg.name === name))
                    .map(arg => `${arg.name}: ${helpers_1.typeName(arg.realType || arg.type, nschema, config.namespace, config.name, context, true, true)}`)
                    .join(", ")}) => this.${op}(${(operation.inMessage.data || [])
                    .map(arg => arg.name)
                    .join(", ")})`;
            })
                .join(",\n")}
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
        : `/* @flow */
${helpers_1.computeImportMatrix(config.namespace || "", target.$namespaceMapping || {}, context)}`}
export interface ${config.name}ErrorHandler {
${Object.keys(config.operations)
        .map(op => {
        const operation = config.operations[op];
        const outMessage = operation.outMessage;
        return `  ${op}?(error: any): ${deferredType}<${__1.messageType(nschema, context, false, outMessage)}>;`;
    })
        .join("\n")}
}


${classHeader[restClientStrategy](context, config)}
export class ${config.name} {
${constructorPart[restClientStrategy](endpointPropertyName, errorHandlerPropertyName, config)}
${renderOperations(nschema, context, config, deferredType, restClientStrategy, endpointPropertyName, errorHandlerPropertyName)}${errorHandlerPart[restClientStrategy]()}}
`;
}
exports.render = render;
