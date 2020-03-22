"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const logging_1 = require("../../../logging");
const model_1 = require("../../../model");
const utils_1 = require("../../../utils");
function typeName($nschemaType, _nschema, namespace, _name, context, addFlowComment) {
    let result;
    const typeMap = (primitiveType) => {
        switch (primitiveType) {
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
                model_1.shouldNever(primitiveType);
        }
        return "string";
    };
    if (typeof $nschemaType === "string") {
        result = typeMap($nschemaType);
    }
    else if (typeof $nschemaType === "object") {
        let typeNamespace = $nschemaType.namespace;
        if (typeof typeNamespace === "undefined") {
            typeNamespace = namespace || "";
        }
        if (typeNamespace !== namespace && context) {
            if (!context.imports[typeNamespace]) {
                context.imports[typeNamespace] = {};
            }
            context.imports[typeNamespace][$nschemaType.name] = true;
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
    async generate(nschema, grpcConfig, template, target, providedContext) {
        const config = utils_1.deepClone(grpcConfig);
        const context = Object.assign(Object.assign(Object.assign({}, buildgRPCContext()), providedContext), { imports: {} });
        const result = template(Object.assign(Object.assign({}, config), { $nschema: nschema }), nschema, context, target);
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
            await nschema.writeFile(filepath, result);
            return {
                config,
                context,
                generated: result
            };
        }
    }
    async init(nschema) {
        const providerPath = path_1.resolve(__dirname, "bind");
        return Promise.all(fs_1.readdirSync(providerPath)
            .filter(item => {
            return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
        })
            .map(directoryPath => {
            return fs_1.readdirSync(path_1.resolve(providerPath, directoryPath)).map(() => {
                return path_1.resolve(providerPath, directoryPath, "index.js");
            });
        })
            .reduce((accumulated, next) => {
            return accumulated.concat(next);
        })
            .filter(item => {
            return path_1.extname(item) === ".js" && fs_1.existsSync(item);
        })
            .map(require)
            .map(async (requiredModule) => {
            if (requiredModule.default) {
                requiredModule = requiredModule.default;
            }
            requiredModule.grpc = this;
            return new Promise((resolve, reject) => {
                if (typeof requiredModule.init === "function") {
                    requiredModule.init(nschema).then(() => {
                        resolve(true);
                    }, (err) => {
                        reject(err);
                    });
                }
                else {
                    resolve(true);
                }
            });
        })).then(undefined, err => {
            throw new Error(err);
        });
    }
}
exports.GRPC = GRPC;
const grpc = new GRPC();
function getDataItems(nschema, nsMessage) {
    const dataItems = [];
    if (nsMessage.extends) {
        const parent = nschema.getMessage(nsMessage.extends.namespace || "", nsMessage.extends.name);
        if (parent) {
            getDataItems(nschema, parent).forEach(dataItem => {
                dataItems.push(dataItem);
            });
        }
        else {
            throw new Error(`could not find parent: ns="${nsMessage.extends.namespace ||
                ""}" name="${nsMessage.extends.name}"`);
        }
    }
    (nsMessage.data || []).map(item => {
        dataItems.push(item);
    });
    return dataItems;
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
            .map((item, itemIndex) => {
            return `${item.name || `item${itemIndex}`}: ${typeName(item.type, nschema, "", "", $context, addFlowComment)}`;
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
