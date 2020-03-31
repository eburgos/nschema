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

function requestArgsType(method: string, encoding: "json" | "querystring") {
  return `{
      data: ${
        encoding === "json" ? `string` : `{ [name:string]: any } | undefined`
      };
      handleAs: string;
      headers: { [name: string]: string };
      method: "${method}";
      url: string;
      withCredentials?: boolean;
      mode: "navigate" | "same-origin" | "no-cors" | "cors";
    }`;
}

/**
 * Tells if a data type is a single date
 *
 * @param {NSchemaType} type
 * @returns
 */
function isSingleDate(type: NSchemaType) {
  if (isPrimitiveTypeString(type as string)) {
    return type === "date";
  } else if (
    typeof type !== "string" &&
    type.name === "date" &&
    type.namespace === ""
  ) {
    if (!type.modifier) {
      return true;
    } else {
      const mods = isArray(type.modifier) ? type.modifier : [type.modifier];
      return mods.length === 1 && mods[0] === "option";
    }
  }
  return false;
}

function getValueOf(parameter: RestMessageArgument) {
  const type = parameter.realType || parameter.type;
  if (isSingleDate(type)) {
    return `${parameter.name} instanceof Date? ${parameter.name}.getTime() : ${parameter.name}`;
  }

  return parameter.name;
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
                .map((argument) => {
                  return getValueOf(argument);
                })
                .join(", ")}${paramsInBody.length > 1 ? `]` : ``})`
            : `qs.stringify({ ${paramsInBody
                .map((argument) => `${argument.name}: ${getValueOf(argument)}`)
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
            paramsInHeader.map((argument) => {
              return isOptional(argument)
                ? `...(typeof ${argument.name} !== "undefined")? { "${
                    argument.headerName || `X-${argument.name}`
                  }": \`\${${getValueOf(argument)}}\` } : {}`
                : `"${
                    argument.headerName || `X-${argument.name}`
                  }": \`\${${getValueOf(argument)}}\``;
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
          .map((argument) => {
            return `{ key: \`${argument.name}\`, value: \`\${${getValueOf(
              argument
            )}}\`}`;
          })
          .join(
            ", "
          )}].reduce((acc, next: { key: string; value: string }) => acc.split(\`{\${next.key}}\`).join(next.value), "${route}")}`
      : `${route}`
  }${
    paramsInQuery.length
      ? `?\${[${`${paramsInQuery
          .map((argument) => {
            return `{ name: \`${argument.name}\`, value: ${getValueOf(
              argument
            )} }`;
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
  [RestClientStrategy.Angular2]: (context: TypeScriptContext) => {
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
  [RestClientStrategy.Angular2]: () =>
    /*_method: string,
    _route: string,
    _routePrefix: string,
    _endpointPropertyName: string,
    _paramsInQuery: NSchemaMessageArgument[],
    _paramsInBody: NSchemaMessageArgument[],
    _paramsInHeader: NSchemaMessageArgument[],
    _paramsInRoute: NSchemaMessageArgument[]*/
    {
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
    return `: ${requestArgsType(method, encoding)} = ${buildRequest(
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
    operationName: string,
    optionsVarName: string,
    endpointPropertyName: string
  ) => {
    return `${
      paramsInQuery.length
        ? `        let $queryParams: URLSearchParams = new URLSearchParams();
    ${paramsInQuery.map((argument) => {
      return `        if (typeof(${argument.name}) !== undefined) {
                $queryParams.set("${argument.name}", ${argument.name}.toString());
            }`;
    })}        ${optionsVarName}.params = $queryParams;`
        : ``
    }
    ${optionsVarName}.headers =  new Headers({
      "Content-Type": "application/json",
      ${paramsInHeader
        .map((argument) => {
          return `"${argument.headerName || `X-${argument.name}`}": ${
            argument.name
          }`;
        })
        .join(",\n                ")}
    });
${
  ["get", "delete", "head"].indexOf(method.toLowerCase()) < 0
    ? `${
        paramsInBody.length
          ? `
let $body = JSON.stringify(${paramsInBody.length > 1 ? `[` : ``}${paramsInBody
              .map((argument) => {
                return argument.name;
              })
              .join(", ")}${paramsInBody.length > 1 ? `]` : ``});`
          : `let $body = "";`
      }`
    : ``
}

    return this.http.${method.toLowerCase()}(this.${endpointPropertyName} + [${paramsInRoute
      .map((argument) => {
        return `\`${argument.name}\``;
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
                        return this.$errorHandler(error, "${operationName}");
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
    operationName: string,
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
      ].map((argument) => argument.name)
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
      if (this.${errorHandlerPropertyName} && this.${errorHandlerPropertyName}.${operationName}) {
        return this.${errorHandlerPropertyName}.${operationName}(err);
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
    .map((operationName) => {
      const operation = config.operations[operationName];
      const {
        method,
        bodyArguments,
        headerArguments,
        inMessage,
        outMessage,
        route,
        routeArguments,
        queryArguments
      } = getOperationDetails(operation, operationName);

      if (method === "get" && bodyArguments.length) {
        throw new Error(
          `Service "${
            config.name
          }" : operation "${operationName}" has method GET and body parameters "${bodyArguments
            .map((argument) => argument.name)
            .join("\n")}". Fix this to continue.`
        );
      }
      const optionsVarName = findNonCollidingName(
        "options",
        (inMessage.data || []).map((argument) => argument.name)
      );
      return `  /**
   *${(operation.description ? ` ${operation.description}` : "").replace(
     /\n/g,
     "\n   * "
   )}
${(inMessage.data || [])
  .map((par) => {
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
            .map((argument) => {
              return (argument.description || "").trim();
            })
            .join(", ")
        )
      )}
   */
  public async ${operationName}(${(inMessage.data || [])
        .map((par) => {
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
      operationName,
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
  .map((contextName) => {
    if (!config.producerContexts) {
      throw new Error("Invalid Argument");
    }
    const pContext = config.producerContexts[contextName];
    const description = pContext.description || "";
    pContext.operations.forEach((operationName) => {
      if (!config.operations[operationName]) {
        throw new Error(
          `Unable to generate producer context ${contextName} for service ${
            config.namespace || ""
          } :: ${
            config.name
          } because it defines a non-existent operation ${operationName}.`
        );
      }
    });
    const contextOperations: {
      [name: string]: NSchemaRestOperation;
    } = Object.keys(config.operations)
      .filter((operationName) => pContext.operations.includes(operationName))
      .reduce((acc: { [name: string]: NSchemaRestOperation }, next) => {
        acc[next] = config.operations[next];
        return acc;
      }, {});
    //Validating that all parameters in context belong to all operations and have the same type
    const operationArguments = pContext.arguments.map((arg) => {
      const { isValidType, lastType } = Object.keys(contextOperations).reduce(
        (acc: { isValidType: boolean; lastType: string | undefined }, cop) => {
          const contextOperation = contextOperations[cop];
          const operationArgument = (
            contextOperation.inMessage.data || []
          ).find((operationArg) => operationArg.name === arg);
          if (!operationArgument) {
            throw new Error(
              `Unable to generate producer context ${contextName} for service ${
                config.namespace || ""
              } :: ${
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
          `Unable to generate producer context ${contextName} for service ${
            config.namespace || ""
          } :: ${
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
      .map((arg) => `${arg.name}: ${arg.type}`)
      .join(", ")}) {
    return {
${Object.keys(contextOperations)
  .map((contextOperationName) => {
    const operation = contextOperations[contextOperationName];
    return `      ${contextOperationName}: (${(operation.inMessage.data || [])
      .filter(
        ({ name }) => !operationArguments.find((arg) => arg.name === name)
      )
      .map(
        (arg) =>
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
      .join(", ")}) => this.${contextOperationName}(${(
      operation.inMessage.data || []
    )
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
  .map((operationName) => {
    const operation = config.operations[operationName];
    const outMessage = operation.outMessage;
    return `  ${operationName}?(error: Error): ${deferredType}<${messageType(
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
