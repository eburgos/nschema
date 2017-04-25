(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "ninejs/core/deferredUtils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const deferredUtils_1 = require("ninejs/core/deferredUtils");
    function execute(parentConfig, nschema) {
        nschema.registerObject(parentConfig);
        var _defer = deferredUtils_1.defer();
        process.nextTick(function () {
            var newConfig = nschema.objClone(parentConfig);
            newConfig.$subType = newConfig.$subType || '';
            var target = newConfig.$target;
            let targetArr;
            if (target) {
                if (!nschema.isArray(target)) {
                    targetArr = [target];
                }
                else {
                    targetArr = target;
                }
                var result = targetArr.map(function (item) {
                    item.type = 'object';
                    return nschema.getTarget(item).generate(newConfig, nschema, item);
                });
                deferredUtils_1.all(result).then(arr => {
                    _defer.resolve(arr);
                });
            }
            else {
                _defer.resolve(false);
            }
        });
        return _defer.promise;
    }
    let obj = {
        type: 'type',
        name: 'object',
        description: 'Generates classes and objects',
        init: function (nschema) {
            return nschema.register('type', this);
        },
        execute: execute
    };
    exports.default = obj;
});
//# sourceMappingURL=object.js.map