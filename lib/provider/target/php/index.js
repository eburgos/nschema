"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const fs_1 = require("fs");
const path_1 = require("path");
const logging_1 = require("../../../logging");
const model_1 = require("../../../model");
const utils_1 = require("../../../utils");
const util_1 = require("util");
const { blue, green, yellow } = chalk;
async function phpGenerate(nschema, nsconfig, template, target, providedContext) {
    const config = utils_1.deepClone(nsconfig);
    const context = Object.assign(Object.assign(Object.assign({}, buildPHPContext()), providedContext), { imports: {} });
    const result = template(config, nschema, context, target);
    if (context.skipWrite) {
        logging_1.writeDebugLog(`${yellow("php")}: skipped write on ${target.location} - ${target.$fileName || target.name || ""} due to context`);
        return Promise.resolve({
            config,
            context,
            generated: result
        });
    }
    else {
        const location = target.location;
        const filepath = location.startsWith(".")
            ? path_1.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.php`)
            : path_1.resolve(location, config.namespace || "", `${config.name}.php`);
        logging_1.writeLog(logging_1.LogLevel.Default, `${blue("php")}: writing to file: ${green(filepath)}`);
        await nschema.writeFile(filepath, result);
        return {
            config,
            context,
            generated: result
        };
    }
}
exports.phpGenerate = phpGenerate;
async function init(nschema) {
    const providerPath = path_1.resolve(__dirname, "bind");
    return Promise.all(fs_1.readdirSync(providerPath)
        .filter((item) => {
        return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
    })
        .map((directoryPath) => {
        return fs_1.readdirSync(path_1.resolve(providerPath, directoryPath)).map((item) => {
            return path_1.resolve(providerPath, directoryPath, item);
        });
    })
        .reduce((accumulated, next) => {
        return accumulated.concat(next);
    })
        .filter((item) => {
        return path_1.extname(item) === ".js" && fs_1.existsSync(item);
    })
        .map(require)
        .map(async (requiredModule) => {
        if (requiredModule.default) {
            requiredModule = requiredModule.default;
        }
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
    })).then(undefined, (err) => {
        throw new Error(err);
    });
}
function getDataItems(nschema, nsMessage) {
    const dataItems = [];
    if (nsMessage.extends) {
        const parent = nschema.getMessage(nsMessage.extends.namespace || "", nsMessage.extends.name);
        if (parent) {
            getDataItems(nschema, parent).forEach((dataItem) => {
                dataItems.push(dataItem);
            });
        }
        else {
            throw new Error(`could not find parent: ns="${nsMessage.extends.namespace || ""}" name="${nsMessage.extends.name}"`);
        }
    }
    (nsMessage.data || []).map((item) => {
        dataItems.push(item);
    });
    return dataItems;
}
const quotesWrap = utils_1.wrap(`"`, `"`);
function findTypeMap(primitiveType, skipError, isParameter) {
    switch (primitiveType) {
        case "int":
            return "number";
        case "float":
            return "number";
        case "string":
            return "string";
        case "bool":
            return "boolean";
        case "date":
            return isParameter ? "Date | number" : "number";
        default:
            model_1.shouldNever(primitiveType, skipError);
            return undefined;
    }
}
function typeMap(primitiveType, isParameter) {
    const result = findTypeMap(primitiveType, false, isParameter);
    if (typeof result === "undefined") {
        logging_1.writeError(`Unknown type ${primitiveType}`);
        throw new Error(`Unknown type ${primitiveType}`);
    }
    return result;
}
function typeName(nschemaType, nschema, namespace, name, context, isParameter, isRootTypeCall) {
    let result;
    if (typeof nschemaType === "string") {
        result = typeMap(nschemaType, isParameter);
    }
    else if (typeof nschemaType === "object") {
        let typeNamespace = nschemaType.namespace;
        if (typeof typeNamespace === "undefined") {
            typeNamespace = namespace || "";
        }
        if (typeNamespace !== namespace &&
            !utils_1.isPrimitiveType(nschemaType) &&
            context) {
            if (!context.imports[typeNamespace]) {
                context.imports[typeNamespace] = {};
            }
            context.imports[typeNamespace][nschemaType.name] = true;
        }
        if (utils_1.isUnions(nschemaType)) {
            result = nschemaType.literals.map(quotesWrap).join(" | ");
        }
        else {
            if (typeof findTypeMap(nschemaType.name, true, true) === "string") {
                result = typeMap(nschemaType.name, isParameter);
            }
            else {
                result = nschemaType.name;
            }
        }
    }
    else {
        result = typeMap("string", isParameter);
    }
    if (nschemaType && typeof nschemaType === "object" && nschemaType.modifier) {
        const modifier = nschemaType.modifier;
        const modifierArr = !util_1.isArray(modifier)
            ? [modifier]
            : modifier;
        modifierArr.forEach((item, itemIndex, arr) => {
            result = `${result}${modifierMap(item, nschema, namespace, name, context)}`;
            if (!isRootTypeCall || itemIndex + 1 < arr.length) {
                result = `(${result})`;
            }
        });
    }
    return result;
}
exports.typeName = typeName;
function messageType(nschema, context, message) {
    const typeSeparator = ", ";
    const dataItems = getDataItems(nschema, message);
    if (dataItems.length === 0) {
        return "void";
    }
    else if (dataItems.length === 1) {
        const item = dataItems[0];
        return `${typeName(item.type, nschema, "", "", context, false, true)}`;
    }
    else {
        return (`{ ${dataItems
            .map((item, itemIndex) => {
            return `${item.name || `item${itemIndex}`}: ${typeName(item.type, nschema, "", "", context, false, true)}`;
        })
            .join(typeSeparator)} }` || "void");
    }
}
exports.messageType = messageType;
function modifierMap(modifier, nschema, namespace, name, context) {
    switch (modifier) {
        case "list":
            return "[]";
        case "array":
            return "[]";
        case "option":
            return " | undefined";
        default:
            return typeName(modifier, nschema, namespace, name, context, false, false);
    }
}
let count = 0;
function buildPHPContext() {
    return {
        hasPHP: true,
        id: count++,
        imports: {},
        skipWrite: false
    };
}
exports.buildPHPContext = buildPHPContext;
exports.default = {
    init
};
