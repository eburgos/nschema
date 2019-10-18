import { isArray } from "util";
import { isRestTarget, TypeScriptRestTarget } from ".";
import { messageType, RestClientStrategy, TypeScriptContext } from "../..";
import {
  NSchemaInterface,
  NSchemaMessageArgument,
  NSchemaRestOperation,
  NSchemaRestService,
  NSchemaType,
  RestMessageArgument,
  Target
} from "../../../../../model";
import {
  findNonCollidingName,
  isOptional,
  wrap,
  isPrimitiveTypeString
} from "../../../../../utils";
import { AnonymousMessage } from "../../../../type/message";
import { computeImportMatrix, typeName } from "../../helpers";
import {
  addSpace,
  getOperationDetails,
  identityStr,
  sortAlphabetically
} from "./common";

function requestArgsType(method: string) {
  return `{
      data: any | undefined;
      handleAs: string;
      headers: { [name: string]: string };
      method: "${method}";
      url: string;
      withCredentials?: boolean;
      mode: "navigate" | "same-origin" | "no-cors" | "cors";
    }`;
}

function isSingleDate(t: NSchemaType) {
  if (isPrimitiveTypeString(t as string)) {
    return t === "date";
  } else if (
    typeof t !== "string" &&
    (t.name === "date" && t.namespace === "")
  ) {
    if (!t.modifier) {
      return true;
    } else {
      const mods = isArray(t.modifier) ? t.modifier : [t.modifier];
      return mods.length === 1 && mods[0] === "option";
    }
  }
  return false;
}

function getValueOf(p: RestMessageArgument) {
  const type = p.realType || p.type;
  if (isSingleDate(type)) {
    return `${p.name} instanceof Date? ${p.name}.getTime() : ${p.name}`;
  }

  return p.name;
}

function buildRequest(
  method: string,
  route: string,
  routePrefix: string,
  endpointPropertyName: string,
  paramsInQuery: RestMessageArgument[],
  paramsInBody: RestMessageArgument[],
  paramsInHeader: RestMessageArgument[],
  paramsInRoute: RestMessageArgument[],
  encoding: "json" | "querystring",
  context: TypeScriptContext
) {
  if (encoding === "querystring") {
    if (!context.imports["{qs}"]) {
      context.imports["{qs}"] = {};
    }
    context.imports["{qs}"]["*"] = "qs";
  }
  return `{
      data: ${
        ["get", "delete", "head"].indexOf(method.toLowerCase()) < 0 &&
        paramsInBody.length > 0
          ? encoding === "json"
            ? `JSON.stringify(${
                paramsInBody.length > 1 ? `[` : ``
              }${paramsInBody
                .map(d => {
                  return getValueOf(d);
                })
                .join(", ")}${paramsInBody.length > 1 ? `]` : ``})`
            : `qs.stringify({ ${paramsInBody
                .map(p => `${p.name}: ${getValueOf(p)}`)
                .join(", ")} })`
          : `undefined`
      },
      handleAs: "json",
      headers: {
        "Content-Type": "${
          encoding === "querystring"
            ? "application/x-www-form-urlencoded"
            : "application/json"
        }"${
    paramsInHeader.length
      ? `,
        ...{
          ${sortAlphabetically(
            paramsInHeader.map(p => {
              return isOptional(p)
                ? `...(typeof ${p.name} !== "undefined")? { "${p.headerName ||
                    `X-${p.name}`}": \`\${${getValueOf(p)}}\` } : {}`
                : `"${p.headerName || `X-${p.name}`}": \`\${${getValueOf(
                    p
                  )}}\``;
            })
          ).join(",\n          ")}
        }
      }`
      : `
      }`
  },
      method: "${method}",
      mode: "cors",
      url: \`\${this.${endpointPropertyName}}${routePrefix}${
    paramsInRoute.length
      ? `\${[${paramsInRoute
          .map(p => {
            return `{ key: \`${p.name}\`, value: \`\${${getValueOf(p)}}\`}`;
          })
          .join(
            ", "
          )}].reduce((acc, next: { key: string; value: string }) => acc.split(\`{\${next.key}}\`).join(next.value), "${route}")}`
      : `${route}`
  }${
    paramsInQuery.length
      ? `?\${[${`${paramsInQuery
          .map(p => {
            return `{ name: \`${p.name}\`, value: ${getValueOf(p)} }`;
            //return `\`${p.name}=\${encodeURIComponent(\`\${${p.name}}\`)}\`}`;
          })
          .join(
            `, `
          )}].filter(item => typeof(item.value) !== "undefined").map(item => \`\${item.name}=\${encodeURIComponent(\`\${item.value}\`)}\`).join("&")}`}`
      : ``
  }\`
    }`;
}

const prepareImports = {
  [RestClientStrategy.Angular2]: (
    context: TypeScriptContext,
    _target: TypeScriptRestTarget
  ) => {
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
  [RestClientStrategy.Default]: (
    context: TypeScriptContext,
    target: TypeScriptRestTarget
  ) => {
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
  [RestClientStrategy.Angular2]: (context: TypeScriptContext) => {
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
  [RestClientStrategy.Default]: (
    _context: TypeScriptContext,
    config: NSchemaRestService
  ) => {
    return `/**
 *${config.description ? ` ${config.description}` : ""}
 *
 * @export
 * @class ${config.name}
 */`;
  }
};

const constructorPart = {
  [RestClientStrategy.Angular2]: (endpointPropertyName: string) => {
    return `  /**
   * Base url for this http service
   */
  ${endpointPropertyName}: string;

  public constructor(private http: Http) {
  }
`;
  },
  [RestClientStrategy.Default]: (
    endpointPropertyName: string,
    errorHandlerPropertyName: string,
    config: NSchemaRestService
  ) => {
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
  [RestClientStrategy.Angular2]: (
    _method: string,
    _route: string,
    _routePrefix: string,
    _endpointPropertyName: string,
    _paramsInQuery: NSchemaMessageArgument[],
    _paramsInBody: NSchemaMessageArgument[],
    _paramsInHeader: NSchemaMessageArgument[],
    _paramsInRoute: NSchemaMessageArgument[]
  ) => {
    return ` = new RequestOptions();`;
  },
  [RestClientStrategy.Default]: (
    method: string,
    route: string,
    routePrefix: string,
    endpointPropertyName: string,
    paramsInQuery: NSchemaMessageArgument[],
    paramsInBody: NSchemaMessageArgument[],
    paramsInHeader: NSchemaMessageArgument[],
    paramsInRoute: NSchemaMessageArgument[],
    encoding: "json" | "querystring",
    context: TypeScriptContext
  ) => {
    return `: ${requestArgsType(method)} = ${buildRequest(
      method,
      route,
      routePrefix,
      endpointPropertyName,
      paramsInQuery,
      paramsInBody,
      paramsInHeader,
      paramsInRoute,
      encoding,
      context
    )};`;
  }
};

const bodyPart = {
  [RestClientStrategy.Angular2]: (
    method: string,
    route: string,
    paramsInQuery: RestMessageArgument[],
    paramsInBody: RestMessageArgument[],
    paramsInHeader: RestMessageArgument[],
    paramsInRoute: RestMessageArgument[],
    _nschema: NSchemaInterface,
    _context: TypeScriptContext,
    _outMessage: AnonymousMessage,
    op: string,
    optionsVarName: string,
    endpointPropertyName: string
  ) => {
    return `${
      paramsInQuery.length
        ? `        let $queryParams: URLSearchParams = new URLSearchParams();
    ${paramsInQuery.map(p => {
      return `        if (typeof(${p.name}) !== undefined) {
                $queryParams.set("${p.name}", ${p.name}.toString());
            }`;
    })}        ${optionsVarName}.params = $queryParams;`
        : ``
    }
    ${optionsVarName}.headers =  new Headers({
      "Content-Type": "application/json",
      ${paramsInHeader
        .map(p => {
          return `"${p.headerName || `X-${p.name}`}": ${p.name}`;
        })
        .join(",\n                ")}
    });
${
  ["get", "delete", "head"].indexOf(method.toLowerCase()) < 0
    ? `${
        paramsInBody.length
          ? `
let $body = JSON.stringify(${paramsInBody.length > 1 ? `[` : ``}${paramsInBody
              .map(d => {
                return d.name;
              })
              .join(", ")}${paramsInBody.length > 1 ? `]` : ``});`
          : `let $body = "";`
      }`
    : ``
}

    return this.http.${method.toLowerCase()}(this.${endpointPropertyName} + [${paramsInRoute
      .map(p => {
        return `\`${p.name}\``;
      })
      .join(
        ", "
      )}].reduce((acc, next: string) => acc.split(\`{\${next}}\`).join(next), "${route}"),${
      ["get", "delete", "head"].indexOf(method.toLowerCase()) < 0
        ? ` $body,`
        : ``
    } ${optionsVarName})
                    .map($toJson)
                    .catch((error) => {
                        return this.$errorHandler(error, "${op}");
                    });`;
  },
  [RestClientStrategy.Default]: (
    method: string,
    _route: string,
    _paramsInQuery: NSchemaMessageArgument[],
    _paramsInBody: NSchemaMessageArgument[],
    _paramsInHeader: NSchemaMessageArgument[],
    _paramsInRoute: NSchemaMessageArgument[],
    nschema: NSchemaInterface,
    context: TypeScriptContext,
    outMessage: AnonymousMessage,
    op: string,
    optionsVarName: string,
    _endpointPropertyName: string,
    errorHandlerPropertyName: string
  ) => {
    const responseVarName = findNonCollidingName(
      "response",
      [
        ..._paramsInBody,
        ..._paramsInHeader,
        ..._paramsInQuery,
        ..._paramsInRoute
      ].map(p => p.name)
    );
    return `try {
      const ${responseVarName} = await request.${method.toLowerCase()}${
      ["delete"].indexOf(method.toLowerCase()) < 0
        ? `<${messageType(nschema, context, false, outMessage)}>`
        : ``
    }(${optionsVarName}.url, ${
      ["delete", "head", "get"].indexOf(method.toLowerCase()) < 0
        ? `${optionsVarName}.data, `
        : ``
    }${
      (outMessage.data || []).length
        ? optionsVarName
        : `{ ...${optionsVarName}, responseType: "text" }`
    });
      return ${responseVarName}.data;
    } catch (err) {
      if (this.${errorHandlerPropertyName} && this.${errorHandlerPropertyName}.${op}) {
        return this.${errorHandlerPropertyName}.${op}(err);
      } else {
        throw err;
      }
    }`;
  }
};

const errorHandlerPart = {
  [RestClientStrategy.Angular2]: () => {
    return `$errorHandler (error:any, operationName: string) {
        return Observable.throw(error.json().error || "Server error");
    };`;
  },
  [RestClientStrategy.Default]: () => {
    return ``;
  }
};

function renderOperations(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  config: NSchemaRestService,
  deferredType: string,
  restClientStrategy: RestClientStrategy,
  endpointPropertyName: string,
  errorHandlerPropertyName: string
) {
  const routePrefix = config.routePrefix || "";
  return `${Object.keys(config.operations)
    .map(op => {
      const operation = config.operations[op];
      const {
        method,
        bodyArguments,
        headerArguments,
        inMessage,
        outMessage,
        route,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation, op);

      if (method === "get" && bodyArguments.length) {
        throw new Error(
          `Service "${
            config.name
          }" : operation "${op}" has method GET and body parameters "${bodyArguments
            .map(d => d.name)
            .join("\n")}". Fix this to continue.`
        );
      }
      const optionsVarName = findNonCollidingName(
        "options",
        (inMessage.data || []).map(m => m.name)
      );
      return `  /**
   *${(operation.description ? ` ${operation.description}` : "").replace(
     /\n/g,
     "\n   * "
   )}
${(inMessage.data || [])
  .map(par => {
    return `   * @param ${par.name} -${addSpace(
      (par.description || "")
        .split("\n")
        .map((doc: string) => doc.trim())
        .join("\n   * ")
    )}
`;
  })
  .join("")}   * @returns${addSpace(
        ((outMessage.data || []).length > 1 ? wrap("[", "]") : identityStr)(
          (outMessage.data || [])
            .map(d => {
              return (d.description || "").trim();
            })
            .join(", ")
        )
      )}
   */
  public async ${op}(${(inMessage.data || [])
        .map(par => {
          return `${par.name}: ${typeName(
            par.type,
            nschema,
            config.namespace,
            config.name,
            context,
            true,
            true,
            true
          )}`;
        })
        .join(", ")}): ${deferredType}<${messageType(
        nschema,
        context,
        false,
        outMessage
      )}> /* :${deferredType}<${messageType(
        nschema,
        context,
        false,
        outMessage
      )}> */ {
    const ${optionsVarName}${requestOptionsPart[restClientStrategy](
        method,
        route,
        routePrefix,
        endpointPropertyName,
        queryArguments,
        bodyArguments,
        headerArguments,
        routeArguments,
        inMessage.encoding || "json",
        context
      )}
    ${bodyPart[restClientStrategy](
      method,
      route,
      queryArguments,
      bodyArguments,
      headerArguments,
      routeArguments,
      nschema,
      context,
      outMessage,
      op,
      optionsVarName,
      endpointPropertyName,
      errorHandlerPropertyName
    )}
  }
`;
    })
    .join("\n")}${
    !config.producerContexts
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
        throw new Error(
          `Unable to generate producer context ${contextName} for service ${config.namespace ||
            ""} :: ${
            config.name
          } because it defines a non-existent operation ${op}.`
        );
      }
    });
    const contextOperations: {
      [name: string]: NSchemaRestOperation;
    } = Object.keys(config.operations)
      .filter(k => pContext.operations.includes(k))
      .reduce((acc: { [name: string]: NSchemaRestOperation }, next) => {
        acc[next] = config.operations[next];
        return acc;
      }, {});
    //Validating that all parameters in context belong to all operations and have the same type
    const operationArguments = pContext.arguments.map(arg => {
      const { isValidType, lastType } = Object.keys(contextOperations).reduce(
        (acc: { isValidType: boolean; lastType: string | undefined }, cop) => {
          const contextOperation = contextOperations[cop];
          const operationArgument = (
            contextOperation.inMessage.data || []
          ).find(operationArg => operationArg.name === arg);
          if (!operationArgument) {
            throw new Error(
              `Unable to generate producer context ${contextName} for service ${config.namespace ||
                ""} :: ${
                config.name
              } because all of it's operations don't have the ${arg} argument.`
            );
          }
          const argumentTypeName = typeName(
            operationArgument.realType || operationArgument.type,
            nschema,
            config.namespace,
            config.name,
            context,
            true,
            true,
            true
          );
          if (
            acc.isValidType &&
            (typeof acc.lastType === "undefined" ||
              acc.lastType === argumentTypeName)
          ) {
            return {
              isValidType: true,
              lastType: argumentTypeName
            };
          } else {
            return { isValidType: false, lastType: undefined };
          }
        },
        { isValidType: true, lastType: undefined }
      );
      if (!isValidType) {
        throw new Error(
          `Unable to generate producer context ${contextName} for service ${config.namespace ||
            ""} :: ${
            config.name
          } because all of it's operations don't have the same type for their ${arg} argument.`
        );
      }
      return {
        name: arg,
        type: lastType
      };
    });
    const replacerPropertyName = findNonCollidingName(
      `contextReplacer`,
      Object.keys(contextOperations)
    );
    return `  /*
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
      .map(
        arg =>
          `${arg.name}: ${typeName(
            arg.realType || arg.type,
            nschema,
            config.namespace,
            config.name,
            context,
            true,
            true,
            true
          )}`
      )
      .join(", ")}) => this.${op}(${(operation.inMessage.data || [])
      .map(arg => arg.name)
      .join(", ")})`;
  })
  .join(",\n")}, ${replacerPropertyName}(${operationArguments
      .map(arg => `new${arg.name}: ${arg.type}`)
      .join(", ")}) {
      ${operationArguments.map(arg => `${arg.name} = new${arg.name}`).join(`;
        `)}
    
  } 
    };
  }`;
  })
  .join("\n")}`
  }`;
}

export function render(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  config: NSchemaRestService,
  targetRaw: Target
) {
  if (!isRestTarget(targetRaw)) {
    throw new Error("Invalid target for typescript rest");
  }
  const endpointPropertyName = findNonCollidingName(
    "endpointUrl",
    Object.keys(config.operations)
  );
  const errorHandlerPropertyName = findNonCollidingName(
    "errorHandler",
    Object.keys(config.operations)
  );
  const target: TypeScriptRestTarget = targetRaw;
  const restClientStrategy =
    target.$restClientStrategy || RestClientStrategy.Default;

  const deferredType = prepareImports[restClientStrategy](context, target);
  return `${
    context.skipWrite
      ? ``
      : `/* @flow */
${computeImportMatrix(
  config.namespace || "",
  target.$namespaceMapping || {},
  context
)}`
  }
export interface ${config.name}ErrorHandler {
${Object.keys(config.operations)
  .map(op => {
    const operation = config.operations[op];
    const outMessage = operation.outMessage;
    return `  ${op}?(error: any): ${deferredType}<${messageType(
      nschema,
      context,
      false,
      outMessage
    )}>;`;
  })
  .join("\n")}
}

${classHeader[restClientStrategy](context, config)}
export class ${config.name} {
${constructorPart[restClientStrategy](
  endpointPropertyName,
  errorHandlerPropertyName,
  config
)}
${renderOperations(
  nschema,
  context,
  config,
  deferredType,
  restClientStrategy,
  endpointPropertyName,
  errorHandlerPropertyName
)}${errorHandlerPart[restClientStrategy]()}
}`;
}
