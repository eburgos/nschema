"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
async function execute(parentConfig, nschema, context) {
    if (parentConfig.type !== "object") {
        throw new Error("Invalid object task");
    }
    nschema.registerObject(parentConfig);
    return new Promise((resolve, reject) => {
        process.nextTick(() => {
            const newConfig = utils_1.deepClone(parentConfig);
            newConfig.subType = newConfig.subType || "";
            const target = newConfig.target;
            if (target) {
                const targetArr = !nschema.isArray(target)
                    ? [target]
                    : target;
                const result = targetArr.map(async (arrayItem) => {
                    const item = Object.assign(Object.assign({}, arrayItem), { type: "object" });
                    const foundTargets = nschema.getTarget(item);
                    if (foundTargets.length > 1) {
                        utils_1.exitOrError(`multiple targets for object: ${utils_1.getCriteria(item)}
      Unable to generate ${newConfig.namespace || ""} :: ${newConfig.name}

      Available targets:

      ${foundTargets.map(utils_1.prettyJson).join("\n--------\n")}
      `);
                        throw new Error();
                    }
                    else if (foundTargets.length === 1) {
                        const foundTarget = foundTargets[0];
                        return await foundTarget.generate(newConfig, nschema, item, context);
                    }
                    else {
                        utils_1.exitOrError(`Target not found for object: ${utils_1.getCriteria(item)}
            Unable to generate ${newConfig.namespace || ""} :: ${newConfig.name}`);
                        throw new Error();
                    }
                });
                Promise.all(result).then(resolve, reject);
            }
            else {
                resolve(false);
            }
        });
    });
}
const obj = {
    description: "Generates classes and objects",
    execute,
    name: "object",
    type: "type",
    async init(nschema) {
        return await nschema.register("type", this);
    },
};
exports.default = obj;
