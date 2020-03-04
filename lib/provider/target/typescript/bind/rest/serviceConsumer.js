"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const common_1 = require("./common");
function renderOperationsInterface(nschema, context, operations, name, namespace) {
    return Object.keys(operations)
        .map(op => {
        const operation = operations[op];
        const { inMessage, outMessage } = common_1.getOperationDetails(operation, op);
        const contextVarName = utils_1.findNonCollidingName("context", (inMessage.data || []).map(d => d.name));
        return `
  /**
   *${common_1.addSpace((operation.description || "").replace(/\n/g, "\n   * "))}
${(inMessage.data || [])
            .map(par => {
            return `   * @param ${par.name} -${common_1.addSpace((par.description || "").replace(/\n/g, "\n   * "))}`;
        })
            .join("\n")}
   * @param ${contextVarName} - Operation context. Optional argument (The service always sends it but you may not implement it in your class)
   * @returns ${(outMessage.data || [])
            .map(d => {
            return (d.description || "").replace(/\n/g, "\n   * ");
        })
            .join(", ") || `{${__1.messageType(nschema, context, false, outMessage)}}`}
   */
  ${op}(${(inMessage.data || [])
            .map(par => {
            return `${par.name}: ${helpers_1.typeName(par.realType || par.type, nschema, namespace, name, context, true, true, true)}`;
        })
            .join(", ")}${(inMessage.data || []).length ? `, ` : ``}${contextVarName}: { request: Request, response: Response }): Promise<${__1.messageType(nschema, context, true, outMessage)}>;`;
    })
        .join("\n");
}
function renderConstructorForClass(_nschema, context, _config, operations) {
    return Object.keys(operations)
        .map(op => {
        const operation = operations[op];
        const { bodyArguments, headerArguments, inMessage, route, routeArguments, queryArguments } = common_1.getOperationDetails(operation, op);
        if (typeof operation.inMessage.encoding === "undefined" ||
            operation.inMessage.encoding === "json") {
            if (!context.imports["{body-parser}"]) {
                context.imports["{body-parser}"] = {};
            }
            context.imports["{body-parser}"]["*"] = "bodyParser";
        }
        if (operation.cors) {
            if (!context.imports["{cors}"]) {
                context.imports["{cors}"] = {};
            }
            context.imports["{cors}"]["default"] = "cors";
        }
        return `    expressApp.${common_1.getHttpVerb(operations[op].method || "get").toLowerCase()}("/${_config.routePrefix}${(route || op).replace(/\{([^\}]+?)\}/g, (_match, g1) => {
            return `:${g1}`;
        })}"${operation.cors ? `, cors()` : ""}, bodyParser.json(), async (expressRequest, expressResponse) => {

${routeArguments
            .map(p => {
            return `      const input${p.name} = ${common_1.realTypeMap(p, `expressRequest.params${helpers_1.renderPropertyAccessor(p.name)}`)};
`;
        })
            .join("")}${queryArguments.map(p => {
            return `        const input${p.name} = ${common_1.realTypeMap(p, `expressRequest.query${helpers_1.renderPropertyAccessor(p.name)}`)};
        `;
        }).join(`,
        `)}${headerArguments.map(p => {
            return `const input${p.name} = ${common_1.realTypeMap(p, `expressRequest.header('${p.headerName || `X-${p.name}`}') || ""`)};`;
        }).join(`
        `)}${bodyArguments.length === 1
            ? `              const input${bodyArguments[0].name} = expressRequest.body;`
            : `${bodyArguments.length
                ? `${bodyArguments.map((p, idx) => {
                    return `const input${p.name} = expressRequest.body[${idx}];
`;
                }).join(`
            `)}`
                : ``}`}

            try {
               expressResponse.status(200).json(await implementation.${op}(${(inMessage.data || [])
            .map(arg => `input${arg.name}`)
            .join(", ")}, { request: expressRequest, response: expressResponse }));
            }
            catch (exception: { statusCode: number, message: string, stack: string }) {
              expressResponse.status(exception.statusCode || 400).send(\`Bad request - $\{exception.message\}\`);
            }
        });`;
    })
        .join("\n");
}
function camelize(text) {
    text = text.replace(/[-_\s.]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
    return text.substr(0, 1).toLowerCase() + text.substr(1);
}
function render(nschema, context, config) {
    if (!context.imports["{events}"]) {
        context.imports["{events}"] = {};
    }
    if (!context.imports["{express}"]) {
        context.imports["{express}"] = {};
    }
    context.imports["{express}"].Express = true;
    context.imports["{express}"].Request = true;
    context.imports["{express}"].Response = true;
    return `export interface ${config.name} {
${renderOperationsInterface(nschema, context, config.operations, config.name, config.namespace || "")}
}

export function ${camelize(config.name)}Controller(expressApp: Express, implementation: ${config.name}) {


${renderConstructorForClass(nschema, context, config, config.operations)}

}
`;
}
exports.render = render;
