(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "ninejs/core/deferredUtils", "path"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const deferredUtils_1 = require("ninejs/core/deferredUtils");
    const path = require("path");
    let excludedConfigNames = ['$type', '$namespace', 'list'];
    function computeImportMatrix(arr, localNamespace, namespaceMapping) {
        let rootContext = {
            imports: {}
        };
        arr.forEach(item => {
            Object.keys(item.$context.imports).forEach(p => {
                if (!rootContext.imports[p]) {
                    rootContext.imports[p] = {};
                }
                let ns = item.$context.imports[p];
                Object.keys(ns).forEach(name => {
                    rootContext.imports[p][name] = true;
                });
            });
        });
        return Object.keys(rootContext.imports)
            .filter(p => !!p && (p !== localNamespace))
            .map(p => {
            return 'import { ' + Object.keys(rootContext.imports[p]).join(', ') + ` } from '${namespaceMapping[p] || ('./' + p)}'`;
        }).join('\n') + '\n';
    }
    function execute(parentConfig, nschema) {
        let config = parentConfig;
        let target = config.$target[0];
        let namespaceMapping = (target.$namespaceMapping || {});
        var arr = parentConfig.list || [];
        let r = arr.map(function (cur) {
            let t = cur.$skipWrite;
            cur.$skipWrite = true;
            return nschema.generate(parentConfig, cur).then(function (result) {
                cur.$skipWrite = t;
                return result;
            });
        });
        return deferredUtils_1.all(r).then(dblarr => {
            let arr = dblarr.reduce((acc, next) => {
                if (nschema.isArray(next)) {
                    return acc.concat(next.filter(item => {
                        return item && item.generated;
                    }));
                }
                else {
                    return acc;
                }
            }, []);
            let results = (arr || [])
                .map(item => {
                return item.generated;
            });
            if (!results.length) {
                return Promise.resolve(false);
            }
            let result = results.join('\n');
            let imports = computeImportMatrix(arr.map(item => item.config), config.namespace, namespaceMapping);
            result = imports + '\n' + result;
            let filepath, location = target.location;
            if (location.indexOf('.') === 0) {
                filepath = path.resolve(process.cwd(), location, (target.$fileName || (config.namespace + '.ts')));
            }
            else {
                filepath = path.resolve(location, (config.$fileName || (config.namespace + '.ts')));
            }
            console.log('writing to file: ' + filepath);
            return nschema.writeFile(filepath, result).then(null, function (err) {
                console.log('error: ');
                console.log(err);
            });
        });
    }
    let bundle = {
        type: '*',
        serviceType: '*',
        bind: '*',
        name: 'bundle-typescript-objects',
        language: 'typescript',
        description: 'Handles the concept of namespacing (TypeScript only) in the generation process',
        execute: execute
    };
    let exportable = {
        init: function (nschema) {
            return nschema.register('customBundle', bundle);
        }
    };
    exports.default = exportable;
});
//# sourceMappingURL=bundle.js.map