"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const logging_1 = require("../../../logging");
const model_1 = require("../../../model");
const utils_1 = require("../../../utils");
const moduleSort = (a, b) => {
    const s1 = a.modulePath.toLocaleLowerCase();
    const s2 = b.modulePath.toLocaleLowerCase();
    for (let cnt = 0; cnt < s1.length; cnt += 1) {
        if (s1[cnt] !== s2[cnt]) {
            if (s1[cnt] === ".") {
                return -1;
            }
            return s1[cnt].localeCompare(s2[cnt]);
        }
    }
    return 0;
};
const importsSort = utils_1.caseInsensitiveSorter((item) => item);
const noWrap = utils_1.wrap("", "");
const curlyWrap = utils_1.wrap("{ ", " }");
function renderImport(importNames, modulePath) {
    const starred = importNames.filter(n => n[0] === "*");
    const normalExports = importNames.filter(n => n[0] !== "*");
    return `${starred.length ? renderImportLine(starred, modulePath, noWrap) : ""}${normalExports.length
        ? `${starred.length ? "\n" : ""}${renderImportLine(normalExports, modulePath, curlyWrap)}`
        : ""}`;
}
function renderImportLine(importNames, modulePath, wrapFn) {
    if (importNames.length === 0) {
        return `import "${modulePath}"`;
    }
    const tryImport = `import ${wrapFn(importNames.join(", "))} from "${modulePath}";`;
    if (tryImport.length < 82) {
        return tryImport;
    }
    else {
        return `import {
  ${importNames.join(`,
  `)}
} from "${modulePath}";`;
    }
}
const surroundWithFlow = utils_1.wrap("/*:: ", " */");
function computeImportMatrix(localNamespace, namespaceMapping, $context) {
    const rootContext = {
        imports: {}
    };
    Object.keys($context.imports).forEach(p => {
        if (!rootContext.imports[p]) {
            rootContext.imports[p] = {};
        }
        const ns = $context.imports[p];
        Object.keys(ns).forEach(name => {
            rootContext.imports[p][name] = $context.imports[p][name];
        });
    });
    const sortedImports = Object.keys(rootContext.imports)
        .filter(p => {
        return p !== localNamespace;
    })
        .map(p => {
        return {
            imports: rootContext.imports[p],
            modulePath: p.indexOf("{") === 0 && p.lastIndexOf("}") === p.length - 1
                ? p.slice(1, p.length - 1)
                : namespaceMapping[p] || (utils_1.isRelativePath(p) ? p : `./${p}`),
            name: p
        };
    });
    sortedImports.sort(moduleSort);
    const lines = sortedImports.map(p => {
        const sorted = Object.keys(p.imports);
        sorted.sort(importsSort);
        const importNames = sorted.map(k => typeof p.imports[k] === "string" ? `${k} as ${p.imports[k]}` : k);
        return renderImport(importNames, p.modulePath);
    });
    if (!lines.length) {
        return "";
    }
    return `${lines.join("\n")}${"\n"}${lines.map(surroundWithFlow).join("\n")}
`;
}
exports.computeImportMatrix = computeImportMatrix;
const unQuotedPropertyRegex = /^[a-zA-Z\_\$][a-zA-Z0-9\$\_]*$/;
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
 */`;
    }
}
exports.renderFileHeader = renderFileHeader;
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
function isUnions(t) {
    return (typeof t.literals !== "undefined" &&
        t.name === "string");
}
function typeName($nschemaType, _nschema, namespace, _name, context, addFlowComment) {
    let result;
    const typeMap = (t) => {
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
                return "number";
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
        if (isUnions($nschemaType)) {
            result = $nschemaType.literals.join(" | ");
        }
        else {
            if (typeMap($nschemaType.name) !== "string") {
                result = typeMap($nschemaType.name);
            }
            else {
                result = $nschemaType.name;
            }
        }
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
function $_getDataItems(nsMessage, $nschema) {
    const r = [];
    if (nsMessage.$extends) {
        const parent = $nschema.getMessage(nsMessage.$extends.namespace || "", nsMessage.$extends.name);
        if (parent) {
            $_getDataItems(parent, $nschema).forEach(i => {
                r.push(i);
            });
        }
        else {
            logging_1.writeError(`could not find parent: ns=${nsMessage.$extends.namespace || ""} name=${nsMessage.$extends.name}`);
            throw new Error("Could not find parent message");
        }
    }
    (nsMessage.data || []).forEach(item => {
        r.push(item);
    });
    return r;
}
function messageType($nschema, $nschemaMessage, $nschemaMessageDirection, $context) {
    const $_typeSeparator = $nschemaMessageDirection === "in"
        ? ", "
        : $nschemaMessageDirection === "out"
            ? ", "
            : "";
    const $_dataItems = $_getDataItems($nschemaMessage, $nschema);
    const result = $_dataItems.length === 0
        ? ["void"]
        : $_dataItems.length === 1
            ? [
                typeName($_dataItems[0].type, $nschema, undefined, undefined, $context)
            ]
            : $_dataItems.map((item, $i) => {
                return `${item.name || `item${$i}`}: ${typeName(item.type, $nschema, undefined, undefined, $context)}`;
            });
    return result.length === 1
        ? result[0]
        : `{ ${result.join($_typeSeparator)} }`;
}
exports.messageType = messageType;
