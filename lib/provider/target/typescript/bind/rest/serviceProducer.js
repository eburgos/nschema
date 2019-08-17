"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const common_1 = require("./common");
function requestArgsType() {
    return `{
      data: any | undefined,
      handleAs: string,
      headers: {[name: string]: string },
      method: string,
      url: string,
    }`;
}
function buildRequest(method, route, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute) {
    return `{
      data: ${["get", "delete", "head"].indexOf(method.toLowerCase()) < 0 &&
        paramsInBody.length > 0
        ? `JSON.stringify(${paramsInBody.length > 1 ? `[` : ``}${paramsInBody
            .map(d => {
            return d.name;
        })
            .join(", ")}${paramsInBody.length > 1 ? `]` : ``})`
        : `undefined`},
      handleAs: "json",
      headers: {
        "Content-Type": "application/json"${paramsInHeader.length
        ? `,
        ...{
          ${common_1.sortAlphabetically(paramsInHeader.map(p => {
            return `"${p.headerName || `X-${p.name}`}": ${p.name}`;
        })).join(",\n          ")}
        }}`
        : `
      }`},
      method: "${method}",
      url: \`\${this.$endpointUrl}${paramsInRoute.length
        ? `\${[${paramsInRoute
            .map(p => {
            return `{ key: \`${p.name}\`, value: \`\${${p.name}}\`}`;
        })
            .join(", ")}].reduce((acc, next: { key: string, value: string }) => acc.split(\`{\${next.key}}\`).join(next.value), "${route}")}`
        : `${route}`}${paramsInQuery.length
        ? `?\${${`${paramsInQuery
            .map(p => {
            return `\`${p.name}=\${encodeURIComponent(\`\${${p.name}}\`)}\`}`;
        })
            .join(` + "&`)}`}`
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
    [__1.RestClientStrategy.Default]: (_context) => {
        return "";
    }
};
const constructorPart = {
    [__1.RestClientStrategy.Angular2]: () => {
        return `  /**
   * Base url for this http service
   */
  $endpointUrl: string;

  constructor(private http: Http) {
  }
`;
    },
    [__1.RestClientStrategy.Default]: () => {
        return `  /**
   * Base url for this http service
   */
  private readonly $endpointUrl: string /* :string */;

  constructor($endpointUrl: string /* :string */) {
      this.$endpointUrl = $endpointUrl;
  }
  /*::
  $endpointUrl: string;
  */
`;
    }
};
const requestOptionsPart = {
    [__1.RestClientStrategy.Angular2]: (_method, _route, _paramsInQuery, _paramsInBody, _paramsInHeader, _paramsInRoute) => {
        return ` = new RequestOptions();`;
    },
    [__1.RestClientStrategy.Default]: (method, route, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute) => {
        return `: ${requestArgsType()} = ${buildRequest(method, route, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute)};`;
    }
};
const bodyPart = {
    [__1.RestClientStrategy.Angular2]: (method, route, paramsInQuery, paramsInBody, paramsInHeader, paramsInRoute, _nschema, _context, _outMessage, op) => {
        return `${paramsInQuery.length
            ? `        let $queryParams: URLSearchParams = new URLSearchParams();
    ${paramsInQuery.map(p => {
                return `        if (typeof(${p.name}) !== undefined) {
                $queryParams.set("${p.name}", ${p.name}.toString());
            }`;
            })}        $options.params = $queryParams;`
            : ``}
    $options.headers =  new Headers({
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

    return this.http.${method.toLowerCase()}(this.$endpointUrl + [${paramsInRoute
            .map(p => {
            return `\`${p.name}\``;
        })
            .join(", ")}].reduce((acc, next: string) => acc.split(\`{\${next}}\`).join(next), "${route}"),${["get", "delete", "head"].indexOf(method.toLowerCase()) < 0
            ? ` $body,`
            : ``} $options)
                    .map($toJson)
                    .catch((error) => {
                        return this.$errorHandler(error, "${op}");
                    });`;
    },
    [__1.RestClientStrategy.Default]: (method, _route, _paramsInQuery, _paramsInBody, _paramsInHeader, _paramsInRoute, nschema, context, outMessage, _op) => {
        return `const $response = await request.${method.toLowerCase()}${["delete"].indexOf(method.toLowerCase()) < 0
            ? `<${__1.messageType(nschema, context, true, outMessage)}>`
            : ``}($options.url, ${["delete", "head", "get"].indexOf(method.toLowerCase()) < 0
            ? `$options.data, `
            : ``}$options);
    return $response.data;`;
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
function renderOperations(nschema, context, config, deferredType, restClientStrategy) {
    return Object.keys(config.operations)
        .map(op => {
        const operation = config.operations[op];
        const { method, bodyArguments, headerArguments, inMessage, outMessage, route, routeArguments, queryArguments } = common_1.getOperationDetails(operation);
        if (method === "get" && bodyArguments.length) {
            throw new Error(`Service "${config.name}" : operation "${op}" has method GET and body parameters. Fix this to continue.`);
        }
        return `  /**
   *${(operation.description ? ` ${operation.description}` : "").replace(/\n/g, "\n   * ")}
${inMessage.data
            .map(par => {
            return `   * @param ${par.name} -${common_1.addSpace((par.description || "")
                .split("\n")
                .map((doc) => doc.trim())
                .join("\n   * "))}
`;
        })
            .join("")}   * @returns${common_1.addSpace((outMessage.data.length > 1 ? utils_1.wrap("[", "]") : common_1.identityStr)(outMessage.data
            .map(d => {
            return (d.description || "").trim();
        })
            .join(", ")))}
   */
  public async ${op}(${inMessage.data
            .map(par => {
            return `${par.name}: ${__1.default.typeName(par.type, nschema, "", "", context, true)}`;
        })
            .join(", ")}): ${deferredType}<${__1.messageType(nschema, context, true, outMessage)}> {
    const $options${requestOptionsPart[restClientStrategy](method, route, queryArguments, bodyArguments, headerArguments, routeArguments)}
    ${bodyPart[restClientStrategy](method, route, queryArguments, bodyArguments, headerArguments, routeArguments, nschema, context, outMessage, op)}
  }
`;
    })
        .join("\n");
}
function render(nschema, context, config, target) {
    const restClientStrategy = target.$restClientStrategy || __1.RestClientStrategy.Default;
    const deferredType = prepareImports[restClientStrategy](context, target);
    return `${context.skipWrite
        ? ``
        : `/* @flow */
${helpers_1.computeImportMatrix(config.namespace || "", target.$namespaceMapping || {}, context)}`}${classHeader[restClientStrategy](context)}
export class ${config.name} {
${constructorPart[restClientStrategy]()}
${renderOperations(nschema, context, config, deferredType, restClientStrategy)}${errorHandlerPart[restClientStrategy]()}}
`;
}
exports.render = render;
