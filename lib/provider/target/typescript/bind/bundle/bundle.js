"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const rest_1 = require("../rest/rest");
const excludedConfigNames = ["$type", "$namespace", "list"];
function computeImportMatrix(arr, localNamespace, namespaceMapping) {
    const rootContext = {
        imports: {}
    };
    arr.forEach(item => {
        Object.keys(item.$context.imports).forEach(p => {
            if (!rootContext.imports[p]) {
                rootContext.imports[p] = {};
            }
            const ns = item.$context.imports[p];
            Object.keys(ns).forEach(name => {
                rootContext.imports[p][name] = true;
            });
        });
    });
    const result = Object.keys(rootContext.imports)
        .filter(p => !!p && p !== localNamespace)
        .map(p => {
        return `import { ${Object.keys(rootContext.imports[p]).join(", ")} } from '${namespaceMapping[p] || `./${p}`}'`;
    });
    return `${result.join("\n")}${"\n"}${result
        .map(r => `/*:: ${r} */`)
        .join("\n")}${"\n"}`;
}
function execute(parentConfig, nschema) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = parentConfig;
        const target = config.$target[0];
        const namespaceMapping = target.$namespaceMapping || {};
        const newTarget = rest_1.checkAndFixTarget(target, namespaceMapping);
        const arr = parentConfig.list || [];
        const r = arr.map((cur) => {
            const tsDefinition = cur;
            const t = tsDefinition.$skipWrite;
            tsDefinition.$skipWrite = true;
            return nschema.generate(parentConfig, cur).then(result => {
                tsDefinition.$skipWrite = t;
                return result;
            });
        });
        const dblarr = yield Promise.all(r);
        const reducedArr = dblarr.reduce((acc, next) => {
            if (nschema.isArray(next)) {
                return acc.concat(next.filter(item => {
                    return item && item.generated;
                }));
            }
            else {
                if (next && next.generated) {
                    return acc.concat([next]);
                }
                else {
                    return acc;
                }
            }
        }, []);
        const results = reducedArr.map(item => {
            return item.generated;
        });
        if (!results.length) {
            return Promise.resolve(false);
        }
        let result = results.join("\n");
        const imports = computeImportMatrix(reducedArr.map(item => item.config), config.namespace, namespaceMapping);
        result = `/* @flow */

${imports}${"\n"}${result}`;
        const location = newTarget.location;
        const filepath = location.indexOf(".") === 0
            ? path.resolve(process.cwd(), location, newTarget.$fileName || `${config.namespace}.ts`)
            : path.resolve(location, config.$fileName || `${config.namespace}.ts`);
        console.log(`bundle: writing to file: ${filepath}`);
        return nschema.writeFile(filepath, result).then(null, err => {
            console.log("error: ");
            console.log(err);
        });
    });
}
const bundle = {
    description: "Handles the concept of namespacing (TypeScript only) in the generation process",
    execute,
    language: "typescript",
    name: "bundle-typescript-objects",
    serviceType: "*",
    type: "*",
    bind(bindName) {
        return bindName !== "rest-serverless";
    }
};
const exportable = {
    init(nschema) {
        return nschema.register("customBundle", bundle);
    }
};
exports.default = exportable;
//# sourceMappingURL=bundle.js.map