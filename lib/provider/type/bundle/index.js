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
const chalk_1 = require("chalk");
const util_1 = require("util");
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const { magenta } = chalk_1.default;
function execute(parentConfig, nschema, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const newConfig = utils_1.updateNamespace(utils_1.deepClone(parentConfig));
        const tempTargets = newConfig.target
            ? util_1.isArray(newConfig.target)
                ? newConfig.target
                : [newConfig.target]
            : [];
        let resultPromise = Promise.resolve(true);
        (tempTargets || []).forEach((tgt) => {
            const customBundle = nschema.getCustomPlugin("customBundle", tgt);
            if (customBundle) {
                resultPromise = resultPromise.then(() => __awaiter(this, void 0, void 0, function* () {
                    newConfig.target = [tgt];
                    if (customBundle) {
                        if (customBundle.execute) {
                            logging_1.writeDebugLog(`executing custom bundle ${magenta(customBundle.name)}`);
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
        });
        yield resultPromise;
        const arr = newConfig.list || [];
        newConfig.target = tempTargets;
        return arr.reduce((acc, next) => __awaiter(this, void 0, void 0, function* () {
            return acc.then(() => __awaiter(this, void 0, void 0, function* () {
                return nschema.generate(newConfig, next, context);
            }));
        }), resultPromise);
    });
}
const bundle = {
    description: "Handles the concept of namespacing in the generation process",
    execute,
    name: "bundle",
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            return nschema.register("type", this);
        });
    },
    type: "type"
};
exports.default = bundle;
