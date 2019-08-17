import { RestMessageArgument, TypeScriptRestTarget } from ".";
import typescript, {
  messageType,
  RestClientStrategy,
  TypeScriptContext
} from "../..";
import {
  NSchemaInterface,
  NSchemaMessageArgument,
  NSchemaRestService
} from "../../../../../model";
import { wrap } from "../../../../../utils";
import { AnonymousMessage } from "../../../../type/message";
import { computeImportMatrix } from "../../helpers";
import {
  addSpace,
  getOperationDetails,
  identityStr,
  sortAlphabetically
} from "./common";

function requestArgsType() {
  return `{
      data: any | undefined,
      handleAs: string,
      headers: {[name: string]: string },
      method: string,
      url: string,
    }`;
}

function buildRequest(
  method: string,
  route: string,
  paramsInQuery: RestMessageArgument[],
  paramsInBody: RestMessageArgument[],
  paramsInHeader: RestMessageArgument[],
  paramsInRoute: RestMessageArgument[]
) {
  return `{
      data: ${
        ["get", "delete", "head"].indexOf(method.toLowerCase()) < 0 &&
        paramsInBody.length > 0
          ? `JSON.stringify(${paramsInBody.length > 1 ? `[` : ``}${paramsInBody
              .map(d => {
                return d.name;
              })
              .join(", ")}${paramsInBody.length > 1 ? `]` : ``})`
          : `undefined`
      },
      handleAs: "json",
      headers: {
        "Content-Type": "application/json"${
          paramsInHeader.length
            ? `,
        ...{
          ${sortAlphabetically(
            paramsInHeader.map(p => {
              return `"${p.headerName || `X-${p.name}`}": ${p.name}`;
            })
          ).join(",\n          ")}
        }}`
            : `
      }`
        },
      method: "${method}",
      url: \`\${this.$endpointUrl}${
        paramsInRoute.length
          ? `\${[${paramsInRoute
              .map(p => {
                return `{ key: \`${p.name}\`, value: \`\${${p.name}}\`}`;
              })
              .join(
                ", "
              )}].reduce((acc, next: { key: string, value: string }) => acc.split(\`{\${next.key}}\`).join(next.value), "${route}")}`
          : `${route}`
      }${
    paramsInQuery.length
      ? `?\${${`${paramsInQuery
          .map(p => {
            return `\`${p.name}=\${encodeURIComponent(\`\${${p.name}}\`)}\`}`;
          })
          .join(` + "&`)}`}`
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
  [RestClientStrategy.Default]: (_context: TypeScriptContext) => {
    return "";
  }
};

const constructorPart = {
  [RestClientStrategy.Angular2]: () => {
    return `  /**
   * Base url for this http service
   */
  $endpointUrl: string;

  constructor(private http: Http) {
  }
`;
  },
  [RestClientStrategy.Default]: () => {
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
  [RestClientStrategy.Angular2]: (
    _method: string,
    _route: string,
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
    paramsInQuery: NSchemaMessageArgument[],
    paramsInBody: NSchemaMessageArgument[],
    paramsInHeader: NSchemaMessageArgument[],
    paramsInRoute: NSchemaMessageArgument[]
  ) => {
    return `: ${requestArgsType()} = ${buildRequest(
      method,
      route,
      paramsInQuery,
      paramsInBody,
      paramsInHeader,
      paramsInRoute
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
    op: string
  ) => {
    return `${
      paramsInQuery.length
        ? `        let $queryParams: URLSearchParams = new URLSearchParams();
    ${paramsInQuery.map(p => {
      return `        if (typeof(${p.name}) !== undefined) {
                $queryParams.set("${p.name}", ${p.name}.toString());
            }`;
    })}        $options.params = $queryParams;`
        : ``
    }
    $options.headers =  new Headers({
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

    return this.http.${method.toLowerCase()}(this.$endpointUrl + [${paramsInRoute
      .map(p => {
        return `\`${p.name}\``;
      })
      .join(
        ", "
      )}].reduce((acc, next: string) => acc.split(\`{\${next}}\`).join(next), "${route}"),${
      ["get", "delete", "head"].indexOf(method.toLowerCase()) < 0
        ? ` $body,`
        : ``
    } $options)
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
    _op: string
  ) => {
    return `const $response = await request.${method.toLowerCase()}${
      ["delete"].indexOf(method.toLowerCase()) < 0
        ? `<${messageType(nschema, context, true, outMessage)}>`
        : ``
    }($options.url, ${
      ["delete", "head", "get"].indexOf(method.toLowerCase()) < 0
        ? `$options.data, `
        : ``
    }$options);
    return $response.data;`;
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
  restClientStrategy: RestClientStrategy
) {
  return Object.keys(config.operations)
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
      } = getOperationDetails(operation);
      if (method === "get" && bodyArguments.length) {
        throw new Error(
          `Service "${
            config.name
          }" : operation "${op}" has method GET and body parameters. Fix this to continue.`
        );
      }
      return `  /**
   *${(operation.description ? ` ${operation.description}` : "").replace(
     /\n/g,
     "\n   * "
   )}
${inMessage.data
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
        (outMessage.data.length > 1 ? wrap("[", "]") : identityStr)(
          outMessage.data
            .map(d => {
              return (d.description || "").trim();
            })
            .join(", ")
        )
      )}
   */
  public async ${op}(${inMessage.data
        .map(par => {
          return `${par.name}: ${typescript.typeName(
            par.type,
            nschema,
            "",
            "",
            context,
            true
          )}`;
        })
        .join(", ")}): ${deferredType}<${messageType(
        nschema,
        context,
        true,
        outMessage
      )}> {
    const $options${requestOptionsPart[restClientStrategy](
      method,
      route,
      queryArguments,
      bodyArguments,
      headerArguments,
      routeArguments
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
      op
    )}
  }
`;
    })
    .join("\n");
}

export function render(
  nschema: NSchemaInterface,
  context: TypeScriptContext,
  config: NSchemaRestService,
  target: TypeScriptRestTarget
) {
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
  }${classHeader[restClientStrategy](context)}
export class ${config.name} {
${constructorPart[restClientStrategy]()}
${renderOperations(
  nschema,
  context,
  config,
  deferredType,
  restClientStrategy
)}${errorHandlerPart[restClientStrategy]()}}
`;
}
