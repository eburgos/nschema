"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const immutability_helper_1 = require("immutability-helper");
const prettyjson_1 = require("prettyjson");
const util_1 = require("util");
const logging_1 = require("./logging");
function hasDefault(t) {
    const x = t;
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
    return (a, b) => mapper(a)
        .toLowerCase()
        .localeCompare(mapper(b).toLowerCase());
}
exports.caseInsensitiveSorter = caseInsensitiveSorter;
function isRelativePath(p) {
    return p[0] === "." || p[0] === "/";
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
        return Object.assign({}, obj, { $namespace: undefined, namespace: `${obj.namespace ? `${obj.namespace}.` : ""}${obj.$namespace}` });
    }
    else {
        return obj;
    }
}
exports.updateNamespace = updateNamespace;
function initialCaps(n) {
    if (!n) {
        return n;
    }
    return n[0].toUpperCase() + n.substr(1);
}
exports.initialCaps = initialCaps;
function appendTarget(config) {
    return config.$type !== "clean" &&
        config.$type !== "import" &&
        config.$target &&
        config.target
        ? Object.assign({}, config, { $target: undefined, target: [
                ...(util_1.isArray(config.target) ? config.target : [config.target]),
                ...(util_1.isArray(config.$target) ? config.$target : [config.$target])
            ] }) : config;
}
exports.appendTarget = appendTarget;
function propagateTarget(config, parentConfig) {
    if (config.$type !== "import" &&
        parentConfig.$type !== "import" &&
        typeof config.target === "undefined" &&
        typeof parentConfig.target !== "undefined") {
        return Object.assign({}, config, { target: util_1.isArray(parentConfig.target)
                ? parentConfig.target
                : [parentConfig.target] });
    }
    else {
        return config;
    }
}
exports.propagateTarget = propagateTarget;
function indent(amount, seed) {
    let r = "";
    for (let cnt = 0; cnt < (amount || 0); cnt += 1) {
        r += seed;
    }
    return r;
}
exports.indent = indent;
function isValidCriteriaProperty(k) {
    return k !== "location" && k.indexOf("$") !== 0;
}
exports.isValidCriteriaProperty = isValidCriteriaProperty;
function getCriteria(obj) {
    const r = {};
    Object.keys(obj)
        .filter(isValidCriteriaProperty)
        .forEach(k => {
        r[k] = obj[k];
    });
    return `
${prettyJson(r)}
`;
}
exports.getCriteria = getCriteria;
function exitOrError(err) {
    logging_1.writeError(err);
    logging_1.writeError("nineschema exited");
    process.exit(1);
}
exports.exitOrError = exitOrError;
function prettyJson(obj) {
    return prettyjson_1.render(obj);
}
exports.prettyJson = prettyJson;
