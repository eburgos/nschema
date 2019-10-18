"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = require("chalk");
const path_1 = require("path");
const util_1 = require("util");
const logging_1 = require("../../../../../logging");
const utils_1 = require("../../../../../utils");
const helpers_1 = require("../../helpers");
const __1 = require("../..");
const { yellow, blue, green } = chalk_1.default;
function computeBundleImportMatrix(arr, localNamespace, namespaceMapping) {
    const rootContext = Object.assign({}, __1.buildPHPContext(), { skipWrite: true });
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
            throw new Error("Invalid PHP bundle task");
        }
        const t = parentConfig;
        const config = utils_1.updateNamespace(Object.assign({}, parentConfig, { $fileName: t.$fileName }));
        const target = util_1.isArray(parentConfig.target)
            ? parentConfig.target[0]
            : parentConfig.target;
        const namespaceMapping = target.$namespaceMapping || {};
        const arr = parentConfig.list || [];
        const r = arr.map((cur) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            logging_1.writeDebugLog(`bundle - php - generating ${cur.type} ${cur.namespace ||
                ""} :: ${cur.name}`);
            return yield nschema.generate(parentConfig, cur, { skipWrite: true });
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
            return Promise.resolve(false);
        }
        let result = results.join("\n");
        const imports = computeBundleImportMatrix(reducedArr.map(item => item.context), config.namespace || "", namespaceMapping);
        result = `<?php
${imports
            ? `
${imports}`
            : ""}
namespace ${(parentConfig.namespace || "").replace(/\./g, "\\")};
${result}`;
        const location = target.location;
        const filepath = location.indexOf(".") === 0
            ? path_1.resolve(process.cwd(), location, target.$fileName || config.$fileName || `${config.namespace}.php`)
            : path_1.resolve(location, target.$fileName || config.$fileName || `${config.namespace}.php`);
        logging_1.writeLog(logging_1.LogLevel.Default, `${yellow("bundle")}: php - ${blue("writing")} to file: ${green(filepath)}`);
        return nschema.writeFile(filepath, result).then(undefined, err => {
            logging_1.writeError("error: ");
            logging_1.writeError(JSON.stringify(err, null, 2));
        });
    });
}
const bundle = {
    description: "Handles the concept of namespacing (PHP only) in the generation process",
    execute,
    language: "php",
    name: "bundle-php-objects",
    serviceType: "*",
    type: "*",
    bind() {
        return true;
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
