"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk = require("chalk");
const util_1 = require("util");
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const { magenta } = chalk;
function execute(parentConfig, nschema, context) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const newConfig = utils_1.updateNamespace(utils_1.deepClone(parentConfig));
        const tempTargets = newConfig.target
            ? util_1.isArray(newConfig.target)
                ? newConfig.target
                : [newConfig.target]
            : [];
        let resultPromise = Promise.resolve(true);
        let customBundleWasExecuted = false;
        (tempTargets || []).forEach((tgt) => {
            const customBundles = nschema.getCustomPlugin("customBundle", tgt);
            if (customBundles.length > 1) {
                logging_1.writeError(`Multiple customBundle plugins found for ${utils_1.getCriteria(tgt)}.
Unable to generate ${parentConfig.namespace || ""}.

Available options are:

${customBundles.map(p => JSON.stringify(p, null, 2)).join("\n")}`);
                throw new Error(`Error: multiple plugins found for ${utils_1.getCriteria(tgt)}.`);
            }
            else if (customBundles.length === 1) {
                const customBundle = customBundles[0];
                resultPromise = resultPromise.then(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    newConfig.target = [tgt];
                    if (customBundle) {
                        if (customBundle.execute) {
                            logging_1.writeDebugLog(`executing custom bundle ${magenta(customBundle.name)}`);
                            customBundleWasExecuted = true;
                            return customBundle.execute(newConfig, nschema, context);
                        }
                        else {
                            throw new Error("custom bundle without execute");
                        }
                    }
                    else {
                        throw new Error("Not possible");
                    }
                }));
            }
            else {
                utils_1.exitOrError(`No custom bundle plugins found for ${utils_1.getCriteria(tgt)}`);
            }
        });
        yield resultPromise;
        const arr = customBundleWasExecuted ? [] : newConfig.list || [];
        newConfig.target = tempTargets;
        return arr.reduce((acc, next) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            return acc.then(() => tslib_1.__awaiter(this, void 0, void 0, function* () {
                return nschema.generate(newConfig, next, context);
            }), utils_1.exitOrError);
        }), resultPromise);
    });
}
const bundle = {
    description: "Handles the concept of namespacing in the generation process",
    execute,
    name: "bundle",
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return nschema.register("type", this);
        });
    },
    type: "type"
};
exports.default = bundle;
