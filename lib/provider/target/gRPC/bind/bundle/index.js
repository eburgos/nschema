"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    arr.forEach((item) => {
        Object.keys(item.imports).forEach((property) => {
            if (!rootContext.imports[property]) {
                rootContext.imports[property] = {};
            }
            const namespace = item.imports[property];
            Object.keys(namespace).forEach((name) => {
                rootContext.imports[property][name] = item.imports[property][name];
            });
        });
    });
    return helpers_1.computeImportMatrix(localNamespace, namespaceMapping, rootContext);
}
async function execute(parentConfig, nschema) {
    if (parentConfig.type !== "bundle") {
        throw new Error("Invalid bundle task");
    }
    if (!parentConfig.target) {
        throw new Error("Invalid gRPC bundle task");
    }
    const parentConfigAny = parentConfig;
    const config = utils_1.updateNamespace(Object.assign(Object.assign({}, parentConfig), { $fileName: parentConfigAny.$fileName }));
    const target = util_1.isArray(parentConfig.target)
        ? parentConfig.target[0]
        : parentConfig.target;
    const namespaceMapping = target.$namespaceMapping || {};
    const newTarget = target;
    const arr = parentConfig.list || [];
    const waitables = arr.map(async (cur) => {
        return nschema.generate(parentConfig, cur, { skipWrite: true });
    });
    const dblarr = await Promise.all(waitables);
    const reducedArr = dblarr.reduce((acc, next) => {
        if (nschema.isArray(next)) {
            return acc.concat(next.filter((item) => {
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
    const results = reducedArr.map((item) => {
        return item.generated;
    });
    if (!results.length) {
        return false;
    }
    let result = results.join("\n");
    const imports = computeBundleImportMatrix(reducedArr.map((item) => item.context), config.namespace || "", namespaceMapping);
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
    }, (err) => {
        logging_1.writeError("error: ");
        logging_1.writeError(JSON.stringify(err, null, 2));
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
    },
};
const exportable = {
    async init(nschema) {
        return nschema.register("customBundle", bundle);
    },
};
exports.default = exportable;
