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
function renderConstructorForClass(_nschema, _context, _config, operations) {
    return Object.keys(operations)
        .map(op => {
        const operation = operations[op];
        const { bodyArguments, headerArguments, inMessage, route, routeArguments, queryArguments } = common_1.getOperationDetails(operation, op);
        return `    expressApp.${common_1.getHttpVerb(operations[op].method || "get").toLowerCase()}("/${route.replace("\{", ":").replace("\}", "") ||
            op.replace(/\{([^\}]+?)\}/g, (_match, g1) => {
                return `:${g1}`;
            })}", async (expressRequest, expressResponse) => {

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
            return `const input${p.name} = ${common_1.realTypeMap(p, `expressRequest.header('${p.headerName || `X-${p.name}`}')`)};`;
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
            catch (e: { statusCode: number, message: string, stack: string }) {
              expressResponse.status(e.statusCode || 400).send(\`Bad request - $\{e.message\}\`);
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
    context.imports["{events}"].EventEmitter = true;
    if (!context.imports["{express}"]) {
        context.imports["{express}"] = {};
    }
    context.imports["{express}"].Express = true;
    context.imports["{express}"].Request = true;
    context.imports["{express}"].Response = true;
    return `export interface ${config.name} {
${renderOperationsInterface(nschema, context, config.operations, config.name, config.namespace || "")}
  on(eventName: "callStarted", handler: (eventData: { name: string, timestamp: Date }) => any): this;
  on(eventName: "callCompleted", handler: (eventData: { name: string, timestamp: Date, result: any }) => any): this;
  on(eventName: "operationError", handler: (eventData: { name: string, timestamp: Date, error: Error }) => any): this;
  on(eventName: string, handler: () => any): this;
}

export function ${camelize(config.name)}Controller(expressApp: Express, implementation: ${config.name}) {


${renderConstructorForClass(nschema, context, config, config.operations)}

}
`;
}
exports.render = render;
