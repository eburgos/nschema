"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const message_1 = require("../message/message");
function execute(origParentConfig, nschema) {
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
    const newConfig = nschema.objClone(parentConfig);
    const target = newConfig.$target;
    const targetArr = (() => {
        if (!nschema.isArray(target)) {
            return [target];
        }
        else {
            return target;
        }
    })();
    const r = targetArr.map(item => {
        item.type = "service";
        const targetImplementation = nschema.getTarget(item);
        if (targetImplementation) {
            return targetImplementation.generate(newConfig, nschema, item);
        }
        else {
            console.error("Service not found: ", item);
            throw new Error("Service not found");
        }
    });
    return Promise.all(r);
}
const service = {
    description: "Handles service generation",
    execute,
    name: "service",
    type: "type",
    init(nschema) {
        nschema.register("type", this);
        return Promise.resolve(null);
    }
};
exports.default = service;
//# sourceMappingURL=service.js.map