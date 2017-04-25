(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function getMessage(ns, name, nschema) {
        var filtered = nschema.context.messages.filter(function (m) {
            return ((m.namespace || '') === (ns || '')) && ((m.name || '') === (name || ''));
        });
        if (filtered.length) {
            return filtered[0];
        }
        return null;
    }
    function processMessage(newConfig, nschema) {
        var unnamedCount = 0;
        if (!newConfig.data) {
            newConfig.data = [];
        }
        if (newConfig.$extends) {
            var eMsg = getMessage(newConfig.$extends.namespace, newConfig.$extends.name, nschema);
            if (eMsg) {
                Array.prototype.splice.apply(newConfig.data, [0, 0].concat(eMsg.data));
            }
            else {
                throw new Error('Could not find a message to extend: namespace=\'' + newConfig.$extends.namespace + '\', name=\'' + newConfig.$extends.name + '\'');
            }
        }
        newConfig.data.forEach(function (par) {
            if (!par.name) {
                unnamedCount += 1;
                par.name = 'unnamedParameter' + unnamedCount;
            }
        });
    }
    exports.processMessage = processMessage;
    ;
    function execute(parentConfig, nschema) {
        nschema.registerObject(parentConfig);
        var newConfig = nschema.objClone(parentConfig);
        processMessage(newConfig, nschema);
        nschema.registerMessage(newConfig);
        return Promise.resolve(false);
    }
    let message = {
        type: 'type',
        name: 'message',
        description: 'Service messages',
        init: function (nschema) {
            nschema.register('type', this);
            return Promise.resolve(null);
        },
        execute: execute
    };
    exports.default = message;
});
//# sourceMappingURL=message.js.map