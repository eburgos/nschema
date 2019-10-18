"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = require("chalk");
const fs_1 = require("fs");
const path_1 = require("path");
const logging_1 = require("../../../logging");
const model_1 = require("../../../model");
const utils_1 = require("../../../utils");
const util_1 = require("util");
const { blue, green, yellow } = chalk_1.default;
function phpGenerate(nschema, nsconfig, template, target, providedContext) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const config = utils_1.deepClone(nsconfig);
        const context = Object.assign({}, buildPHPContext(), providedContext, { imports: {} });
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
            const filepath = location.indexOf(".") === 0
                ? path_1.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.php`)
                : path_1.resolve(location, config.namespace || "", `${config.name}.php`);
            logging_1.writeLog(logging_1.LogLevel.Default, `${blue("php")}: writing to file: ${green(filepath)}`);
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
exports.phpGenerate = phpGenerate;
function init(nschema) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const providerPath = path_1.resolve(__dirname, "bind");
        return Promise.all(fs_1.readdirSync(providerPath)
            .filter(item => {
            return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
        })
            .map(d => {
            return fs_1.readdirSync(path_1.resolve(providerPath, d)).map(i => {
                return path_1.resolve(providerPath, d, i);
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
function getDataItems(nschema, nsMessage) {
    const r = [];
    if (nsMessage.extends) {
        const parent = nschema.getMessage(nsMessage.extends.namespace || "", nsMessage.extends.name);
        if (parent) {
            getDataItems(nschema, parent).forEach(i => {
                r.push(i);
            });
        }
        else {
            throw new Error(`could not find parent: ns="${nsMessage.extends.namespace ||
                ""}" name="${nsMessage.extends.name}"`);
        }
    }
    (nsMessage.data || []).map(item => {
        r.push(item);
    });
    return r;
}
function messageType(nschema, context, addFlowComment, message) {
    const typeSeparator = ", ";
    const dataItems = getDataItems(nschema, message);
    if (dataItems.length === 0) {
        return "void";
    }
    else if (dataItems.length === 1) {
        const item = dataItems[0];
        return `${typeName(item.type, nschema, "", "", context, addFlowComment, false, true)}`;
    }
    else {
        return (`{ ${dataItems
            .map((item, $i) => {
            return `${item.name || `item${$i}`}: ${typeName(item.type, nschema, "", "", context, addFlowComment, false, true)}`;
        })
            .join(typeSeparator)} }` || "void");
    }
}
exports.messageType = messageType;
function findTypeMap(t, skipError, isParameter) {
    switch (t) {
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
            model_1.shouldNever(t, skipError);
            return undefined;
    }
}
function typeMap(t, isParameter) {
    const r = findTypeMap(t, false, isParameter);
    if (typeof r === "undefined") {
        logging_1.writeError(`Unknown type ${t}`);
        throw new Error(`Unknown type ${t}`);
    }
    return r;
}
const quotesWrap = utils_1.wrap(`"`, `"`);
function modifierMap(modifier, nschema, namespace, name, context) {
    switch (modifier) {
        case "list":
            return "[]";
        case "array":
            return "[]";
        case "option":
            return " | undefined";
        default:
            return typeName(modifier, nschema, namespace, name, context, false, false, false);
    }
}
function typeName(nschemaType, nschema, namespace, name, context, addFlowComment, isParameter, isRootTypeCall) {
    let result;
    if (typeof nschemaType === "string") {
        result = typeMap(nschemaType, isParameter);
    }
    else if (typeof nschemaType === "object") {
        let ns = nschemaType.namespace;
        if (typeof ns === "undefined") {
            ns = namespace || "";
        }
        if (ns !== namespace && !utils_1.isPrimitiveType(nschemaType) && context) {
            if (!context.imports[ns]) {
                context.imports[ns] = {};
            }
            context.imports[ns][nschemaType.name] = true;
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
        modifierArr.forEach((item, i, arr) => {
            result = `${result}${modifierMap(item, nschema, namespace, name, context)}`;
            if (!isRootTypeCall || i + 1 < arr.length) {
                result = `(${result})`;
            }
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
