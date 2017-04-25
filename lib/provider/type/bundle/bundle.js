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
    let excludedConfigNames = ['$type', '$namespace', 'list'];
    function execute(parentConfig, nschema) {
        var cnt, arr = parentConfig.list || [], len = arr.length, cur, newConfig = nschema.objClone(parentConfig);
        nschema.mixinRecursive(newConfig, parentConfig, function (_1, _2, p) {
            return excludedConfigNames.indexOf(p) < 0;
        });
        if (parentConfig.$namespace) {
            newConfig.namespace += '.' + parentConfig.$namespace;
        }
        let tempTargets = newConfig.$target;
        let resultPromise = Promise.resolve(true);
        let toRemove = [];
        (tempTargets || []).forEach(function (tgt, i) {
            let customBundle = nschema.getCustomPlugin('customBundle', tgt);
            if (customBundle) {
                resultPromise = resultPromise.then(() => {
                    newConfig.$target = [tgt];
                    return customBundle.execute(newConfig, nschema).then(() => {
                        newConfig.$target = tempTargets;
                    });
                });
                toRemove.push(i);
            }
        });
        toRemove.reverse().forEach(i => {
            newConfig.$target.splice(i, 1);
        });
        return arr.reduce((acc, next) => {
            return acc.then(() => {
                return nschema.generate(newConfig, next);
            });
        }, resultPromise);
    }
    let bundle = {
        type: 'type',
        name: 'bundle',
        description: 'Handles the concept of namespacing in the generation process',
        init: function (nschema) {
            return nschema.register('type', this);
        },
        execute: execute
    };
    exports.default = bundle;
});
//# sourceMappingURL=bundle.js.map