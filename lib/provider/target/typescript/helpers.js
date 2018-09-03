"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
const common_1 = require("./bind/rest/common");
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
function renderImport(importNames, modulePath) {
    if (importNames.length === 0) {
        return `import "${modulePath}"`;
    }
    const tryImport = `import { ${importNames.join(", ")} } from "${modulePath}";`;
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
const surroundWithFlow = common_1.wrap("/*:: ", " */");
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
        const importNames = sorted.map(k => (typeof p.imports[k] === "string" ? `${k} as ${p.imports[k]}` : k));
        return renderImport(importNames, p.modulePath);
    });
    return `${lines.join("\n")}${"\n"}${lines
        .map(surroundWithFlow)
        .join("\n")}${"\n"}`;
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
//# sourceMappingURL=helpers.js.map