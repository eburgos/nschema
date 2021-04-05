"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageType = exports.typeName = exports.renderFileHeader = exports.renderPropertyAccessor = exports.computeImportMatrix = void 0;
const util_1 = require("util");
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const moduleSort = (source, target) => {
    const sourceLowercased = source.modulePath.toLocaleLowerCase();
    const targetLowercased = target.modulePath.toLocaleLowerCase();
    for (let cnt = 0; cnt < sourceLowercased.length; cnt += 1) {
        if (sourceLowercased[cnt] !== targetLowercased[cnt]) {
            if (sourceLowercased[cnt] === ".") {
                return -1;
            }
            return sourceLowercased[cnt].localeCompare(targetLowercased[cnt]);
        }
    }
    return 0;
};
const importsSort = utils_1.caseInsensitiveSorter((item) => item);
const noWrap = utils_1.wrap("", "");
const curlyWrap = utils_1.wrap("{ ", " }");
const quotesWrap = utils_1.wrap(`"`, `"`);
function renderImportLine(importNames, modulePath, wrapFn) {
    if (importNames.length === 0) {
        return `require_once "${modulePath}"`;
    }
    const tryImport = `require_once /*${wrapFn(importNames.join(", "))}*/ "${modulePath}";`;
    if (tryImport.length < 82) {
        return tryImport;
    }
    else {
        return `require_once /*
  ${importNames.join(`,
  `)}
*/ "${modulePath}";`;
    }
}
function renderImport(importNames, modulePath) {
    const starred = importNames.filter((name) => name.startsWith("*"));
    const normalExports = importNames.filter((name) => !name.startsWith("*"));
    return `${starred.length ? renderImportLine(starred, modulePath, noWrap) : ""}${normalExports.length
        ? `${starred.length ? "\n" : ""}${renderImportLine(normalExports, modulePath, curlyWrap)}`
        : ""}`;
}
function computeImportMatrix(localNamespace, namespaceMapping, $context) {
    const rootContext = {
        imports: {}
    };
    Object.keys($context.imports).forEach((importName) => {
        if (!rootContext.imports[importName]) {
            rootContext.imports[importName] = {};
        }
        const namespace = $context.imports[importName];
        Object.keys(namespace).forEach((name) => {
            rootContext.imports[importName][name] =
                $context.imports[importName][name];
        });
    });
    const sortedImports = Object.keys(rootContext.imports)
        .filter((importName) => {
        return importName !== localNamespace;
    })
        .map((importName) => {
        return {
            imports: rootContext.imports[importName],
            modulePath: importName.startsWith("{") && importName.endsWith("}")
                ? importName.slice(1, importName.length - 1)
                : namespaceMapping[importName] ||
                    (utils_1.isRelativePath(importName) ? importName : `./${importName}`),
            name: importName
        };
    });
    sortedImports.sort(moduleSort);
    const lines = sortedImports.map((sortedImport) => {
        const sorted = Object.keys(sortedImport.imports);
        sorted.sort(importsSort);
        const importNames = sorted.map((sortedName) => typeof sortedImport.imports[sortedName] === "string"
            ? `${sortedName} as ${sortedImport.imports[sortedName]}`
            : sortedName);
        return renderImport(importNames, sortedImport.modulePath);
    });
    if (!lines.length) {
        return "";
    }
    return `${lines.join("\n")}
`;
}
exports.computeImportMatrix = computeImportMatrix;
const unQuotedPropertyRegex = /^[a-zA-Z_$][a-zA-Z0-9$_]*$/;
function renderPropertyAccessor(property) {
    if (unQuotedPropertyRegex.test(property)) {
        return `.${property}`;
    }
    else {
        return `["${property}"]`;
    }
}
exports.renderPropertyAccessor = renderPropertyAccessor;
function renderFileHeader(obj) {
    if (obj.append) {
        return "";
    }
    else {
        return `/**
 * ${typeof obj.description === "string"
            ? obj.description.replace(/\n/g, "\n * ")
            : ""}
 *
 * @export
 * @${obj.subType === "enumeration" ? "enum" : "interface"} ${obj.name}
 */`;
    }
}
exports.renderFileHeader = renderFileHeader;
function typeName(nschemaType, nschema, namespace, name, context, isParameter, isRootTypeCall) {
    let result;
    if (typeof nschemaType === "string") {
        result = utils_1.typeMap(nschemaType, isParameter);
    }
    else if (typeof nschemaType === "object") {
        let namespace = nschemaType.namespace;
        if (typeof namespace === "undefined") {
            namespace = namespace || "";
        }
        if (namespace !== namespace && !utils_1.isPrimitiveType(nschemaType) && context) {
            if (!context.imports[namespace]) {
                context.imports[namespace] = {};
            }
            context.imports[namespace][nschemaType.name] = true;
        }
        if (utils_1.isUnions(nschemaType)) {
            result = nschemaType.literals.map(quotesWrap).join(" | ");
        }
        else {
            if (typeof utils_1.findTypeMap(nschemaType.name, true, true) === "string") {
                result = utils_1.typeMap(nschemaType.name, isParameter);
            }
            else {
                result = nschemaType.name;
            }
        }
    }
    else {
        result = utils_1.typeMap("string", isParameter);
    }
    if (nschemaType && typeof nschemaType === "object" && nschemaType.modifier) {
        const $modifier = nschemaType.modifier;
        const modifierArr = !util_1.isArray($modifier)
            ? [$modifier]
            : $modifier;
        modifierArr.forEach((item, itemIndex, arr) => {
            result = modifierMap(result, item, nschema, namespace, name, context);
            if (!isRootTypeCall || itemIndex + 1 < arr.length) {
                result = `(${result})`;
            }
        });
    }
    return result;
}
exports.typeName = typeName;
function modifierMap(result, modifier, nschema, namespace, name, context) {
    switch (modifier) {
        case "list":
            return `${result}[]`;
        case "array":
            return `${result}[]`;
        case "option":
            return `${result} | undefined`;
        case "map":
            return `{ [key: string]: ${result} }`;
        default:
            return typeName(modifier, nschema, namespace, name, context, false, false);
    }
}
function getDataItems(nsMessage, $nschema) {
    const dataItems = [];
    if (nsMessage.extends) {
        const parent = $nschema.getMessage(nsMessage.extends.namespace || "", nsMessage.extends.name);
        if (parent) {
            getDataItems(parent, $nschema).forEach((dataItem) => {
                dataItems.push(dataItem);
            });
        }
        else {
            logging_1.writeError(`could not find parent: ns=${nsMessage.extends.namespace || ""} name=${nsMessage.extends.name}`);
            throw new Error("Could not find parent message");
        }
    }
    (nsMessage.data || []).forEach((item) => {
        dataItems.push(item);
    });
    return dataItems;
}
function messageType(nschema, nschemaMessage, nschemaMessageDirection, context) {
    const typeSeparator = nschemaMessageDirection === "in"
        ? ", "
        : nschemaMessageDirection === "out"
            ? ", "
            : "";
    const dataItems = getDataItems(nschemaMessage, nschema);
    const result = dataItems.length === 0
        ? ["void"]
        : dataItems.length === 1
            ? [
                typeName(dataItems[0].type, nschema, nschemaMessage.namespace, nschemaMessage.name, context, true, true)
            ]
            : dataItems.map((item, itemIndex) => {
                return `${item.name || `item${itemIndex}`}: ${typeName(item.type, nschema, nschemaMessage.namespace, nschemaMessage.name, context, true, true)}`;
            });
    return result.length === 1 ? result[0] : `{ ${result.join(typeSeparator)} }`;
}
exports.messageType = messageType;
