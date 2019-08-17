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
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
function execute(parentConfig, nschema, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (parentConfig.$type !== "object") {
            throw new Error("Invalid object task");
        }
        nschema.registerObject(parentConfig);
        return new Promise((resolve, reject) => {
            process.nextTick(() => {
                const newConfig = utils_1.deepClone(parentConfig);
                newConfig.$subType = newConfig.$subType || "";
                const target = newConfig.target;
                if (target) {
                    const targetArr = !nschema.isArray(target)
                        ? [target]
                        : target;
                    const result = targetArr.map((arrayItem) => __awaiter(this, void 0, void 0, function* () {
                        const item = Object.assign({}, arrayItem, { type: "object" });
                        const foundTarget = nschema.getTarget(item);
                        if (foundTarget) {
                            return yield foundTarget.generate(newConfig, nschema, item, context);
                        }
                        else {
                            logging_1.writeError("Target not found");
                            logging_1.writeError(item);
                            throw new Error("Target not found");
                        }
                    }));
                    Promise.all(result).then(resolve, reject);
                }
                else {
                    resolve(false);
                }
            });
        });
    });
}
const obj = {
    description: "Generates classes and objects",
    execute,
    name: "object",
    type: "type",
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield nschema.register("type", this);
        });
    }
};
exports.default = obj;
