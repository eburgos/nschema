"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationDetails = exports.sortAlphabetically = exports.addSpace = exports.identityStr = exports.includeInHeader = exports.includeInQuery = exports.includeInRoute = exports.getType = exports.getHttpVerb = exports.realTypeMap = void 0;
const util_1 = require("util");
const utils_1 = require("../../../../../utils");
const __1 = require("../..");
function realTypeMap(context, argument, expr) {
    const realType = typeof argument.realType === "string"
        ? { name: argument.realType }
        : argument.realType
            ? argument.realType
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
            return `(Number.isNaN(Number.parseFloat(${expr})) ? new Date(${expr}) : new Date(Number.parseFloat(${expr})))`;
        default:
            __1.enableImport(context, "qs");
            return `qs.parse(${expr})`;
    }
}
exports.realTypeMap = realTypeMap;
function getHttpVerb(verb) {
    if (verb === "delete") {
        return "del";
    }
    return verb;
}
exports.getHttpVerb = getHttpVerb;
function getType(argument) {
    return typeof argument.type === "string"
        ? { namespace: "", name: argument.type }
        : argument.type;
}
exports.getType = getType;
function includeInRoute(argument, route) {
    const type = getType(argument);
    const isInRoute = route.indexOf(`{${argument.name}}`) >= 0;
    return (isInRoute &&
        (!type.modifier || (util_1.isArray(type.modifier) && !type.modifier.length)) &&
        type.namespace === "" &&
        utils_1.isPrimitiveTypeString(type.name));
}
exports.includeInRoute = includeInRoute;
function includeInQuery(argument) {
    return argument.paramType === "query";
}
exports.includeInQuery = includeInQuery;
function includeInHeader(argument) {
    return argument.paramType === "header";
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
    const clonedArray = [...arr];
    clonedArray.sort(alphabeticSorter);
    return clonedArray;
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
        .filter((argument) => includeInRoute(argument, route))
        .map((argument) => {
        return Object.assign(Object.assign({}, argument), { realType: getType(argument), type: {
                name: "string",
                namespace: ""
            } });
    });
    allParams = allParams.filter((argument) => {
        return !includeInRoute(argument, route);
    });
    const paramsInQuery = allParams
        .filter(includeInQuery)
        .map((argument) => {
        return Object.assign(Object.assign({}, argument), { realType: getType(argument), type: {
                name: "string",
                namespace: ""
            } });
    });
    allParams = allParams.filter((argument) => {
        return !includeInQuery(argument);
    });
    const paramsInHeader = allParams
        .filter(includeInHeader)
        .map((argument) => {
        return Object.assign(Object.assign({}, argument), { realType: getType(argument), type: {
                name: "string",
                namespace: ""
            } });
    });
    allParams = allParams.filter((argument) => {
        return !includeInHeader(argument);
    });
    const paramsInBody = allParams.filter((argument) => {
        return !includeInRoute(argument, route);
    });
    const paramsOutHeader = (outMessage.data || [])
        .slice(0)
        .filter(includeInHeader);
    const paramsOutBody = allOutParams.filter((argument) => {
        return !includeInHeader(argument);
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
