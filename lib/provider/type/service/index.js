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
const utils_1 = require("../../../utils");
const message_1 = require("../message");
function execute(origParentConfig, nschema, providedContext) {
    return __awaiter(this, void 0, void 0, function* () {
        if (origParentConfig.$type !== "service") {
            throw new Error("Invalid service task");
        }
        const parentConfig = origParentConfig;
        if (parentConfig.operations) {
            const operations = parentConfig.operations;
            for (const p in operations) {
                if (operations.hasOwnProperty(p)) {
                    message_1.processMessage(operations[p].inMessage, nschema);
                    message_1.processMessage(operations[p].outMessage, nschema);
                }
            }
        }
        nschema.registerService(parentConfig);
        return yield new Promise((resolve, reject) => {
            process.nextTick(() => {
                const newConfig = utils_1.deepClone(parentConfig);
                const target = newConfig.target;
                if (target) {
                    const targetArr = !nschema.isArray(target)
                        ? [target]
                        : target;
                    const r = targetArr.map((item) => __awaiter(this, void 0, void 0, function* () {
                        item.type = "service";
                        const targetImplementation = nschema.getTarget(item);
                        if (targetImplementation) {
                            return yield targetImplementation.generate(newConfig, nschema, item, providedContext);
                        }
                        else {
                            console.error("Service not found: ", item);
                            throw new Error("Service not found");
                        }
                    }));
                    Promise.all(r).then(resolve, reject);
                }
                else {
                    resolve(false);
                }
            });
        });
    });
}
const service = {
    description: "Handles service generation",
    execute,
    name: "service",
    type: "type",
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            nschema.register("type", this);
            return Promise.resolve(null);
        });
    }
};
exports.default = service;
