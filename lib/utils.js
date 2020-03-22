"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutability_helper_1 = require("immutability-helper");
const prettyjson_1 = require("prettyjson");
const util_1 = require("util");
const logging_1 = require("./logging");
const model_1 = require("./model");
function hasDefault(task) {
    const x = task;
    if (x.default) {
        return true;
    }
    return false;
}
function requireDefaultOrPackage(location) {
    const newConfig = require(location);
    if (!newConfig) {
        throw new Error(`Invalid import location: ${location}`);
    }
    const cfg = hasDefault(newConfig) ? newConfig.default : newConfig;
    return cfg;
}
exports.requireDefaultOrPackage = requireDefaultOrPackage;
function caseInsensitiveSorter(mapper) {
    return (source, target) => mapper(source)
        .toLowerCase()
        .localeCompare(mapper(target).toLowerCase());
}
exports.caseInsensitiveSorter = caseInsensitiveSorter;
function isRelativePath(path) {
    return path[0] === "." || path[0] === "/";
}
exports.isRelativePath = isRelativePath;
function wrap(left, right) {
    return (src) => {
        return `${left}${src}${right}`;
    };
}
exports.wrap = wrap;
function deepClone(obj) {
    return immutability_helper_1.default(obj, {});
}
exports.deepClone = deepClone;
function updateNamespace(obj) {
    if (obj.$namespace) {
        return Object.assign(Object.assign({}, obj), { $namespace: undefined, namespace: `${obj.namespace ? `${obj.namespace}.` : ""}${obj.$namespace}` });
    }
    else {
        return obj;
    }
}
exports.updateNamespace = updateNamespace;
function initialCaps(srcString) {
    if (!srcString) {
        return srcString;
    }
    return srcString[0].toUpperCase() + srcString.substr(1);
}
exports.initialCaps = initialCaps;
function appendTarget(config) {
    return config.type !== "clean" &&
        config.type !== "import" &&
        config.$target &&
        config.target
        ? Object.assign(Object.assign({}, config), { $target: undefined, target: [
                ...(util_1.isArray(config.target) ? config.target : [config.target]),
                ...(util_1.isArray(config.$target) ? config.$target : [config.$target])
            ] }) : config;
}
exports.appendTarget = appendTarget;
function propagateTarget(config, parentConfig) {
    if (config.type !== "import" &&
        parentConfig.type !== "import" &&
        typeof config.target === "undefined" &&
        typeof parentConfig.target !== "undefined") {
        return Object.assign(Object.assign({}, config), { target: util_1.isArray(parentConfig.target)
                ? parentConfig.target
                : [parentConfig.target] });
    }
    else {
        return config;
    }
}
exports.propagateTarget = propagateTarget;
function indent(amount, seed) {
    let result = "";
    for (let cnt = 0; cnt < (amount || 0); cnt += 1) {
        result += seed;
    }
    return result;
}
exports.indent = indent;
function isValidCriteriaProperty(key) {
    return key !== "location" && key.indexOf("$") !== 0;
}
exports.isValidCriteriaProperty = isValidCriteriaProperty;
function prettyJson(obj) {
    return prettyjson_1.render(obj);
}
exports.prettyJson = prettyJson;
function getCriteria(obj) {
    const result = {};
    Object.keys(obj)
        .filter(isValidCriteriaProperty)
        .forEach(key => {
        result[key] = obj[key];
    });
    return `
${prettyJson(result)}
`;
}
exports.getCriteria = getCriteria;
function exitOrError(err) {
    logging_1.writeError(err);
    logging_1.writeError("nineschema exited");
    process.exit(1);
}
exports.exitOrError = exitOrError;
function findNonCollidingName(desired, opts, filter) {
    let current = desired;
    let cnt = 0;
    while (opts.indexOf(current) >= 0 && (!filter || filter(current))) {
        cnt += 1;
        current = `${desired}${cnt}`;
    }
    return current;
}
exports.findNonCollidingName = findNonCollidingName;
function isOptional(property) {
    if (property.realType) {
        return isOptional({ type: property.realType });
    }
    if (typeof property.type === "object") {
        if (property.type.modifier) {
            const mods = util_1.isArray(property.type.modifier)
                ? property.type.modifier
                : [property.type.modifier];
            return mods.indexOf("option") === mods.length - 1;
        }
    }
    return false;
}
exports.isOptional = isOptional;
function removeOptional(type) {
    if (typeof type === "string") {
        return type;
    }
    const mods = type.modifier
        ? util_1.isArray(type.modifier)
            ? type.modifier
            : [type.modifier]
        : [];
    if (mods.length > 0 && mods[mods.length - 1] === "option") {
        return Object.assign(Object.assign({}, type), { modifier: mods.slice(0, mods.length - 1) });
    }
    return type;
}
exports.removeOptional = removeOptional;
function isUnions(type) {
    return (typeof type.literals !== "undefined" &&
        type.name === "string" &&
        type.namespace === "");
}
exports.isUnions = isUnions;
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
exports.findTypeMap = findTypeMap;
function typeMap(primitiveType, isParameter) {
    const result = findTypeMap(primitiveType, false, isParameter);
    if (typeof result === "undefined") {
        logging_1.writeError(`Unknown type ${primitiveType}`);
        throw new Error(`Unknown type ${primitiveType}`);
    }
    return result;
}
exports.typeMap = typeMap;
function isPrimitiveTypeString(primitiveType) {
    const x = primitiveType;
    switch (x) {
        case "bool":
        case "date":
        case "string":
        case "int":
        case "float":
            return true;
        default:
            model_1.shouldNever(x, true);
            return false;
    }
}
exports.isPrimitiveTypeString = isPrimitiveTypeString;
function isPrimitiveType(nschemaType) {
    if (typeof nschemaType === "string") {
        return isPrimitiveTypeString(nschemaType);
    }
    else if (isUnions(nschemaType)) {
        return true;
    }
    else {
        if (nschemaType.namespace === "") {
            return isPrimitiveType(nschemaType.name);
        }
        else {
            return false;
        }
    }
}
exports.isPrimitiveType = isPrimitiveType;
