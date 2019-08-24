"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const message_1 = require("../message");
function execute(origParentConfig, nschema, providedContext) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (origParentConfig.type !== "service") {
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
                    const r = targetArr.map((item) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                        item.type = "service";
                        try {
                            const foundTargets = nschema.getTarget(item);
                            if (foundTargets.length > 1) {
                                utils_1.exitOrError(`multiple targets for service: ${utils_1.getCriteria(item)}
Unable to generate service ${newConfig.namespace || ""} :: ${newConfig.name}

Available targets:

${foundTargets.map(utils_1.prettyJson).join("\n--------\n")}
        `);
                                throw new Error();
                            }
                            else if (foundTargets.length === 1) {
                                const targetImplementation = foundTargets[0];
                                return yield targetImplementation.generate(newConfig, nschema, item, providedContext);
                            }
                            else {
                                utils_1.exitOrError(`Target not found for service: ${utils_1.getCriteria(item)}
Unable to generate service ${newConfig.namespace || ""} :: ${newConfig.name}`);
                                throw new Error();
                            }
                        }
                        catch (err) {
                            logging_1.writeError(err);
                            reject(err);
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
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            nschema.register("type", this);
            return Promise.resolve(null);
        });
    }
};
exports.default = service;
