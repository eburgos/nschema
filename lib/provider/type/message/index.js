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
    return __awaiter(this, void 0, void 0, function* () {
        if (parentConfig.$type !== "message") {
            throw new Error("Invalid message task");
        }
        nschema.registerMessage(parentConfig);
        const newConfig = utils_1.deepClone(parentConfig);
        processMessage(newConfig, nschema);
        nschema.registerMessage(newConfig);
        return Promise.resolve(false);
    });
}
const message = {
    description: "Service messages",
    execute,
    name: "message",
    init(nschema) {
        return __awaiter(this, void 0, void 0, function* () {
            nschema.register("type", this);
            return Promise.resolve(null);
        });
    },
    type: "type"
};
exports.default = message;