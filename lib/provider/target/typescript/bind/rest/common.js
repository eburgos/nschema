"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const utils_1 = require("../../../../../utils");
function realTypeMap(p, expr) {
    const realType = typeof p.realType === "string"
        ? { name: p.realType }
        : p.realType
            ? p.realType
            : { name: null };
    switch (realType.name) {
        case "string":
            return expr;
        case "int":
        case "float":
            return `Number(${expr})`;
        case "bool":
            return `(${expr} === "true")`;
        case "date":
            return `(new Date(${expr}))`;
        default:
            return null;
    }
}
exports.realTypeMap = realTypeMap;
function getHttpVerb(v) {
    if (v === "delete") {
        return "del";
    }
    return v;
}
exports.getHttpVerb = getHttpVerb;
function getType(p) {
    return typeof p.type === "string" ? { namespace: "", name: p.type } : p.type;
}
exports.getType = getType;
function includeInRoute(p, route) {
    const t = getType(p);
    return (route.indexOf(`{${p.name}}`) >= 0 &&
        (!t.modifier || (util_1.isArray(t.modifier) && !t.modifier.length)) &&
        t.namespace === "" &&
        (t.name === "string" ||
            t.name === "int" ||
            t.name === "float" ||
            t.name === "bool" ||
            t.name === "date"));
}
exports.includeInRoute = includeInRoute;
function includeInQuery(p) {
    const t = getType(p);
    return (p.paramType === "query" &&
        (!t.modifier || (util_1.isArray(t.modifier) && !t.modifier.length)) &&
        t.namespace === "" &&
        (t.name === "string" ||
            t.name === "int" ||
            t.name === "float" ||
            t.name === "bool" ||
            t.name === "date"));
}
exports.includeInQuery = includeInQuery;
function includeInHeader(p) {
    return p.paramType === "header";
}
exports.includeInHeader = includeInHeader;
function identityStr(src) {
    return src;
}
exports.identityStr = identityStr;
function addSpace(str) {
    if (str) {
        return ` ${str}`;
    }
    return "";
}
exports.addSpace = addSpace;
const alphabeticSorter = utils_1.caseInsensitiveSorter(identityStr);
function sortAlphabetically(arr) {
    const r = [...arr];
    r.sort(alphabeticSorter);
    return r;
}
exports.sortAlphabetically = sortAlphabetically;
function getOperationDetails(operation, name) {
    const inMessage = operation.inMessage;
    const outMessage = operation.outMessage;
    const route = operation.route || name;
    const method = (operation.method || "get").toLowerCase();
    let allParams = (inMessage.data || []).slice(0);
    const allOutParams = (outMessage.data || []).slice(0);
    const paramsInRoute = allParams
        .filter(p => includeInRoute(p, route))
        .map(p => {
        return Object.assign({}, p, { realType: getType(p), type: {
                name: "string",
                namespace: ""
            } });
    });
    allParams = allParams.filter(p => {
        return !includeInRoute(p, route);
    });
    const paramsInQuery = allParams
        .filter(includeInQuery)
        .map(p => {
        return Object.assign({}, p, { realType: getType(p), type: {
                name: "string",
                namespace: ""
            } });
    });
    allParams = allParams.filter(p => {
        return !includeInQuery(p);
    });
    const paramsInHeader = allParams
        .filter(includeInHeader)
        .map(p => {
        return Object.assign({}, p, { realType: getType(p), type: {
                name: "string",
                namespace: ""
            } });
    });
    allParams = allParams.filter(p => {
        return !includeInHeader(p);
    });
    const paramsInBody = allParams.filter(p => {
        return !includeInRoute(p, route);
    });
    const paramsOutHeader = (outMessage.data || [])
        .slice(0)
        .filter(includeInHeader);
    const paramsOutBody = allOutParams.filter(p => {
        return !includeInHeader(p);
    });
    return {
        bodyArguments: paramsInBody,
        headerArguments: paramsInHeader,
        inMessage,
        method,
        outBodyArguments: paramsOutBody,
        outHeaderArguments: paramsOutHeader,
        outMessage,
        queryArguments: paramsInQuery,
        route,
        routeArguments: paramsInRoute
    };
}
exports.getOperationDetails = getOperationDetails;
