"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
function renderImport(importNames, modulePath) {
    const starred = importNames.filter((name) => name.startsWith("*"));
    const normalExports = importNames.filter((name) => !name.startsWith("*"));
    return `${starred.length ? renderImportLine(starred, modulePath, noWrap) : ""}${normalExports.length
        ? `${starred.length ? "\n" : ""}${renderImportLine(normalExports, modulePath, curlyWrap)}`
        : ""}`;
}
function computeImportMatrix(localNamespace, namespaceMapping, context) {
    const rootContext = {
        imports: {}
    };
    Object.keys(context.imports).forEach((importItem) => {
        if (!rootContext.imports[importItem]) {
            rootContext.imports[importItem] = {};
        }
        const namespace = context.imports[importItem];
        Object.keys(namespace).forEach((name) => {
            rootContext.imports[importItem][name] = context.imports[importItem][name];
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
    const lines = sortedImports.map((importName) => {
        const sorted = Object.keys(importName.imports);
        sorted.sort(importsSort);
        const importNames = sorted.map((sortedImportName) => typeof importName.imports[sortedImportName] === "string"
            ? `${sortedImportName} as ${importName.imports[sortedImportName]}`
            : sortedImportName);
        return renderImport(importNames, importName.modulePath);
    });
    return `${lines.join("\n")}${"\n"}`;
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
