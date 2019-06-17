"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getMessage(ns, name, nschema) {
    const filtered = nschema.context().messages.filter(m => {
        return ((m.namespace || "") === (ns || "") && (m.name || "") === (name || ""));
    });
    if (filtered.length) {
        return filtered[0];
    }
    return null;
}
function processMessage(newConfig, nschema) {
    let unnamedCount = 0;
    if (!newConfig.data) {
        newConfig.data = [];
    }
    if (newConfig.$extends) {
        const eMsg = getMessage(newConfig.$extends.namespace, newConfig.$extends.name, nschema);
        if (eMsg) {
            Array.prototype.splice.apply(newConfig.data, [
                0,
                0,
                ...(eMsg.data || [])
            ]);
        }
        else {
            throw new Error(`Could not find a message to extend: namespace='${newConfig.$extends.namespace}', name='${newConfig.$extends.name}'`);
        }
        newConfig.$extends = undefined;
    }
    newConfig.data.forEach(par => {
        if (!par.name) {
            unnamedCount += 1;
            par.name = `unnamedParameter${unnamedCount}`;
        }
    });
}
exports.processMessage = processMessage;
function execute(parentConfig, nschema) {
    nschema.registerObject(parentConfig);
    const newConfig = nschema.objClone(parentConfig);
    processMessage(newConfig, nschema);
    nschema.registerMessage(newConfig);
    return Promise.resolve(false);
}
const message = {
    description: "Service messages",
    execute,
    name: "message",
    init(nschema) {
        nschema.register("type", this);
        return Promise.resolve(null);
    },
    type: "type"
};
exports.default = message;
//# sourceMappingURL=message.js.map