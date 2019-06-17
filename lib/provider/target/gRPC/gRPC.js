"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const logging_1 = require("../../../logging");
const model_1 = require("../../../model");
const util_1 = require("util");
function modifierMap(modifier) {
    switch (modifier) {
        case "list":
            return "[]";
        case "array":
            return "[]";
        case "option":
            return "| undefined";
        default:
            return typeName(modifier);
    }
}
class gRPC {
    init(nschema) {
        const providerPath = path.resolve(__dirname, "bind");
        const self = this;
        return Promise.all(fs
            .readdirSync(providerPath)
            .filter(item => {
            return fs.statSync(path.resolve(providerPath, item)).isDirectory();
        })
            .map(d => {
            return fs.readdirSync(path.resolve(providerPath, d)).map(i => {
                return path.resolve(providerPath, d, i);
            });
        })
            .reduce((a, b) => {
            return a.concat(b);
        })
            .filter(item => {
            return path.extname(item) === ".js" && fs.existsSync(item);
        })
            .map(require)
            .map(m => {
            if (m.default) {
                m = m.default;
            }
            m.grpc = self;
            return new Promise((resolve, reject) => {
                if (typeof m.init === "function") {
                    m.init(nschema).then(() => {
                        resolve(true);
                    }, (err) => {
                        reject(err);
                    });
                }
                else {
                    resolve(true);
                }
            });
        })).then(() => {
            return arguments[0];
        }, err => {
            throw new Error(err);
        });
    }
    generate(nschema, $nsconfig, template, target, providedContext) {
        const nsconfig = $nsconfig.$u.clone($nsconfig);
        const config = nsconfig;
        config.$nschema = nschema;
        config.$target = target;
        const context = Object.assign({}, buildgRPCContext(), providedContext, { imports: {} });
        const result = template(Object.assign({}, config, { $nschema: nschema }, { $context: context }));
        if (context.skipWrite) {
            return Promise.resolve({
                config,
                context,
                generated: result
            });
        }
        else {
            const location = target.location;
            const filepath = location.indexOf(".") === 0
                ? path.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.proto`)
                : path.resolve(location, config.namespace || "", config.$fileName || `${config.name}.proto`);
            logging_1.writeLog(logging_1.LogLevel.Default, `gRPC: writing to file: ${filepath}`);
            return nschema.writeFile(filepath, result).then(_ => {
                return {
                    config,
                    context,
                    generated: result
                };
            }, err => {
                throw new Error(err);
            });
        }
    }
}
exports.gRPC = gRPC;
const grpc = new gRPC();
function getDataItems(nschema, nsMessage) {
    const r = [];
    if (nsMessage.$extends) {
        const parent = nschema.getMessage(nsMessage.$extends.namespace || "", nsMessage.$extends.name);
        if (parent) {
            getDataItems(nschema, parent).forEach(i => {
                r.push(i);
            });
        }
        else {
            throw new Error(`could not find parent: ns="${nsMessage.$extends.namespace ||
                ""}" name="${nsMessage.$extends.name}"`);
        }
    }
    (nsMessage.data || []).map(item => {
        r.push(item);
    });
    return r;
}
function messageType(nschema, $context, addFlowComment, message) {
    const typeSeparator = ", ";
    const dataItems = getDataItems(nschema, message);
    if (dataItems.length === 0) {
        return "void";
    }
    else if (dataItems.length === 1) {
        const item = dataItems[0];
        return `${typeName(item.type, nschema, "", "", $context, addFlowComment)}`;
    }
    else {
        return (`{ ${dataItems
            .map((item, $i) => {
            return `${item.name || `item${$i}`}: ${typeName(item.type, nschema, "", "", $context, addFlowComment)}`;
        })
            .join(typeSeparator)} }` || "void");
    }
}
exports.messageType = messageType;
let count = 0;
function buildgRPCContext() {
    return {
        grpc,
        id: count++,
        imports: {},
        skipWrite: false
    };
}
exports.buildgRPCContext = buildgRPCContext;
exports.default = grpc;
function typeName($nschemaType, _nschema, namespace, _name, context, addFlowComment) {
    let result;
    const typeMap = (t) => {
        switch (t) {
            case "int":
                return "int32";
            case "float":
                return "number";
            case "string":
                return "string";
            case "bool":
                return "boolean";
            case "date":
                return "Date";
            default:
                model_1.shouldNever(t);
        }
        return "string";
    };
    if (typeof $nschemaType === "string") {
        result = typeMap($nschemaType);
    }
    else if (typeof $nschemaType === "object") {
        let ns = $nschemaType.namespace;
        if (typeof ns === "undefined") {
            ns = namespace || "";
        }
        if (ns !== namespace && context) {
            if (!context.imports[ns]) {
                context.imports[ns] = {};
            }
            context.imports[ns][$nschemaType.name] = true;
        }
        result = $nschemaType.name;
    }
    else {
        result = typeMap("string");
    }
    if ($nschemaType &&
        typeof $nschemaType === "object" &&
        $nschemaType.modifier) {
        const $modifier = $nschemaType.modifier;
        const modifierArr = !util_1.isArray($modifier)
            ? [$modifier]
            : $modifier;
        modifierArr.forEach(item => {
            result = `(${result} ${modifierMap(item)})`;
        });
    }
    if (addFlowComment) {
        return `${result} /* :${result} */`;
    }
    else {
        return result;
    }
}
exports.typeName = typeName;
//# sourceMappingURL=gRPC.js.map