"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const logging_1 = require("../../../logging");
const model_1 = require("../../../model");
const utils_1 = require("../../../utils");
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
class GRPC {
    generate(nschema, $nsconfig, template, target, providedContext) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const config = utils_1.deepClone($nsconfig);
            const context = Object.assign({}, buildgRPCContext(), providedContext, { imports: {} });
            const result = template(Object.assign({}, config, { $nschema: nschema }), nschema, context, target);
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
                    ? path_1.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.proto`)
                    : path_1.resolve(location, config.namespace || "", config.$fileName || `${config.name}.proto`);
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
        });
    }
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const providerPath = path_1.resolve(__dirname, "bind");
            const self = this;
            return Promise.all(fs_1.readdirSync(providerPath)
                .filter(item => {
                return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
            })
                .map(d => {
                return fs_1.readdirSync(path_1.resolve(providerPath, d)).map(_i => {
                    return path_1.resolve(providerPath, d, "index.js");
                });
            })
                .reduce((a, b) => {
                return a.concat(b);
            })
                .filter(item => {
                return path_1.extname(item) === ".js" && fs_1.existsSync(item);
            })
                .map(require)
                .map((m) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
            }))).then(undefined, err => {
                throw new Error(err);
            });
        });
    }
}
exports.GRPC = GRPC;
const grpc = new GRPC();
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
