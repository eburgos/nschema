(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "../message/message", "ninejs/core/deferredUtils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const message_1 = require("../message/message");
    const deferredUtils_1 = require("ninejs/core/deferredUtils");
    function execute(origParentConfig, nschema) {
        let parentConfig = origParentConfig;
        var operations;
        if (parentConfig.operations) {
            operations = parentConfig.operations;
            for (var p in operations) {
                if (operations.hasOwnProperty(p)) {
                    message_1.processMessage(operations[p].inMessage, nschema);
                    message_1.processMessage(operations[p].outMessage, nschema);
                }
            }
        }
        nschema.registerService(parentConfig);
        var newConfig = nschema.objClone(parentConfig);
        var target = newConfig.$target;
        let targetArr;
        if (!nschema.isArray(target)) {
            targetArr = [target];
        }
        else {
            targetArr = target;
        }
        var r = targetArr.map(function (item) {
            item.type = 'service';
            var targetImplementation = nschema.getTarget(item);
            return targetImplementation.generate(newConfig, nschema, item);
        });
        return deferredUtils_1.all(r);
    }
    let service = {
        type: 'type',
        name: 'service',
        description: 'Handles service generation',
        init: function (nschema) {
            nschema.register('type', this);
            return Promise.resolve(null);
        },
        execute: execute
    };
    exports.default = service;
});
//# sourceMappingURL=service.js.map