"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils");
function getMessage(namespace, name, nschema) {
    const filtered = nschema.context.messages.filter((message) => {
        return ((message.namespace || "") === (namespace || "") &&
            (message.name || "") === (name || ""));
    });
    if (filtered.length) {
        return filtered[0];
    }
    return undefined;
}
function processMessage(newConfig, nschema, parentNamespace) {
    let unnamedCount = 0;
    if (!newConfig.data) {
        newConfig.data = [];
    }
    if (newConfig.extends) {
        const eMsg = getMessage(typeof newConfig.extends.namespace !== "undefined"
            ? newConfig.extends.namespace
            : parentNamespace, newConfig.extends.name, nschema);
        if (eMsg) {
            Array.prototype.splice.apply(newConfig.data, [
                0,
                0,
                ...(eMsg.data || [])
            ]);
        }
        else {
            throw new Error(`Could not find a message to extend: namespace='${newConfig.extends.namespace}', name='${newConfig.extends.name}'`);
        }
        newConfig.extends = undefined;
    }
    newConfig.data.forEach((par) => {
        if (!par.name) {
            unnamedCount += 1;
            par.name = `unnamedParameter${unnamedCount}`;
        }
    });
}
exports.processMessage = processMessage;
async function execute(parentConfig, nschema) {
    if (parentConfig.type !== "message") {
        throw new Error("Invalid message task");
    }
    nschema.registerMessage(parentConfig);
    const newConfig = utils_1.deepClone(parentConfig);
    processMessage(newConfig, nschema, newConfig.namespace || "");
    nschema.registerMessage(newConfig);
    return Promise.resolve(false);
}
const message = {
    description: "Service messages",
    execute,
    name: "message",
    async init(nschema) {
        nschema.register("type", this);
        return Promise.resolve(null);
    },
    type: "type"
};
exports.default = message;
