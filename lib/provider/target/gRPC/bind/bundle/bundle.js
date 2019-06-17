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
const gRPC_1 = require("../../gRPC");
const helpers_1 = require("../../helpers");
const excludedConfigNames = ["$type", "$namespace", "list"];
function computeBundleImportMatrix(arr, localNamespace, namespaceMapping) {
    const rootContext = Object.assign({}, gRPC_1.buildgRPCContext(), { skipWrite: true });
    arr.forEach(item => {
        Object.keys(item.imports).forEach(p => {
            if (!rootContext.imports[p]) {
                rootContext.imports[p] = {};
            }
            const ns = item.imports[p];
            Object.keys(ns).forEach(name => {
                rootContext.imports[p][name] = item.imports[p][name];
            });
        });
    });
    return helpers_1.computeImportMatrix(localNamespace, namespaceMapping, rootContext);
}
function execute(parentConfig, nschema) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = parentConfig;
        const target = config.$target[0];
        const namespaceMapping = target.$namespaceMapping || {};
        const newTarget = target;
        const arr = parentConfig.list || [];
        const r = arr.map((cur) => {
            return nschema.generate(parentConfig, cur, { skipWrite: true });
        });
        const dblarr = yield Promise.all(r);
        const reducedArr = dblarr.reduce((acc, next) => {
            if (nschema.isArray(next)) {
                return acc.concat(next.filter(item => {
                    return item && item.generated && item.context;
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
            return false;
        }
        let result = results.join("\n");
        const imports = computeBundleImportMatrix(reducedArr.map(item => item.context), config.namespace, namespaceMapping);
        result = `syntax = "proto3";

option java_multiple_files = true;
option java_package = "${config.namespace}";
option java_outer_classname = "${config.namespace}Proto";
option objc_class_prefix = "RTG";
  
package ${config.namespace};
/* Imports:
${imports}${"\n"}
*/

${result}`;
        const location = newTarget.location;
        const filepath = location.indexOf(".") === 0
            ? path.resolve(process.cwd(), location, newTarget.$fileName || `${config.namespace}.proto`)
            : path.resolve(location, config.$fileName || `${config.namespace}.proto`);
        console.log(`bundle: writing to file: ${filepath}`);
        return nschema.writeFile(filepath, result).then(null, err => {
            console.log("error: ");
            console.log(err);
        });
    });
}
const bundle = {
    description: "Handles gRPC bundling",
    execute,
    language: "gRPC",
    name: "bundle-gRPC-objects",
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