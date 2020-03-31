"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const message_1 = require("../message");
async function execute(origParentConfig, nschema, providedContext) {
    if (origParentConfig.type !== "service") {
        throw new Error("Invalid service task");
    }
    const parentConfig = origParentConfig;
    if (parentConfig.operations) {
        const operations = parentConfig.operations;
        for (const operationKey in operations) {
            if (Object.prototype.hasOwnProperty.call(operations, operationKey)) {
                message_1.processMessage(operations[operationKey].inMessage, nschema, parentConfig.namespace || "");
                message_1.processMessage(operations[operationKey].outMessage, nschema, parentConfig.namespace || "");
            }
        }
    }
    nschema.registerService(parentConfig);
    return await new Promise((resolve, reject) => {
        process.nextTick(() => {
            const newConfig = utils_1.deepClone(parentConfig);
            const target = newConfig.target;
            if (target) {
                const targetArr = !nschema.isArray(target)
                    ? [target]
                    : target;
                const waitables = targetArr.map(async (item) => {
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
                            return await targetImplementation.generate(newConfig, nschema, item, providedContext);
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
                });
                Promise.all(waitables).then(resolve, reject);
            }
            else {
                resolve(false);
            }
        });
    });
}
const service = {
    description: "Handles service generation",
    execute,
    name: "service",
    type: "type",
    async init(nschema) {
        await nschema.register("type", this);
    }
};
exports.default = service;
