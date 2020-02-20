"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk = require("chalk");
const path_1 = require("path");
const util_1 = require("util");
const __1 = require("../..");
const logging_1 = require("../../../../../logging");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const { yellow, blue, green } = chalk;
function computeBundleImportMatrix(arr, localNamespace, namespaceMapping) {
    const rootContext = Object.assign(Object.assign({}, __1.buildgRPCContext()), { skipWrite: true });
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (parentConfig.type !== "bundle") {
            throw new Error("Invalid bundle task");
        }
        if (!parentConfig.target) {
            throw new Error("Invalid gRPC bundle task");
        }
        const t = parentConfig;
        const config = utils_1.updateNamespace(Object.assign(Object.assign({}, parentConfig), { $fileName: t.$fileName }));
        const target = util_1.isArray(parentConfig.target)
            ? parentConfig.target[0]
            : parentConfig.target;
        const namespaceMapping = target.$namespaceMapping || {};
        const newTarget = target;
        const arr = parentConfig.list || [];
        const r = arr.map((cur) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return nschema.generate(parentConfig, cur, { skipWrite: true });
        }));
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
        const imports = computeBundleImportMatrix(reducedArr.map(item => item.context), config.namespace || "", namespaceMapping);
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
            ? path_1.resolve(process.cwd(), location, newTarget.$fileName || `${config.namespace}.proto`)
            : path_1.resolve(location, config.$fileName || `${config.namespace}.proto`);
        logging_1.writeLog(logging_1.LogLevel.Default, `${yellow("bundle")}: gRPC - ${blue("writing")} to file: ${green(filepath)}`);
        return nschema.writeFile(filepath, result).then(() => {
            logging_1.writeDebugLog(`${yellow("bundle-gRPC-objects")}: clearing children list in ${parentConfig.namespace || ""}`);
            parentConfig.list = [];
        }, err => {
            logging_1.writeError("error: ");
            logging_1.writeError(JSON.stringify(err, null, 2));
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return nschema.register("customBundle", bundle);
        });
    }
};
exports.default = exportable;
