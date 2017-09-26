(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs", "path", "ninejs/core/deferredUtils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs = require("fs");
    const path = require("path");
    const deferredUtils_1 = require("ninejs/core/deferredUtils");
    let modifierMap = (modifier) => {
        switch (modifier) {
            case 'list':
                return '[]';
            case 'array':
                return '[]';
            default:
                return modifier;
        }
    };
    class TypeScript {
        init(nschema) {
            var providerPath = path.resolve(__dirname, 'bind'), self = this;
            return deferredUtils_1.all(fs
                .readdirSync(providerPath)
                .filter(function (item) {
                return fs.statSync(path.resolve(providerPath, item)).isDirectory();
            })
                .map(function (d) {
                return fs.readdirSync(path.resolve(providerPath, d)).map(function (i) {
                    return path.resolve(providerPath, d, i);
                });
            })
                .reduce(function (a, b) {
                return a.concat(b);
            })
                .filter(item => {
                return ((path.extname(item) === '.js') && fs.existsSync(item));
            })
                .map(require)
                .map(function (m) {
                if (m['default']) {
                    m = m['default'];
                }
                var mLoad = deferredUtils_1.defer();
                m.typescript = self;
                if (typeof (m.init) === 'function') {
                    m.init(nschema).then(() => {
                        mLoad.resolve(true);
                    }, (err) => {
                        mLoad.reject(err);
                    });
                }
                else {
                    mLoad.resolve(true);
                }
                return mLoad.promise;
            }))
                .then(() => { }, (err) => {
                console.log(err);
            });
        }
        generate(nschema, _nsconfig, template, target) {
            var nsconfig = _nsconfig.$u.clone(_nsconfig);
            let config = nsconfig;
            config.$nschema = nschema;
            config.$typescript = this;
            config.$target = target;
            if (typeof (config.$skipWrite) === 'undefined') {
                config.$skipWrite = false;
            }
            if (config.$context) {
                throw new Error('must not have a $context variable');
            }
            config.$context = {
                imports: {}
            };
            var result = template(config);
            if (config.$skipWrite) {
                return Promise.resolve({
                    generated: result,
                    config: config
                });
            }
            else {
                var filepath, location = target.location;
                if (location.indexOf('.') === 0) {
                    filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.ts')));
                }
                else {
                    filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.ts')));
                }
                console.log('typescript: writing to file: ' + filepath);
                return nschema.writeFile(filepath, result).then(_ => {
                    return {
                        generated: result,
                        config: config
                    };
                }, function (err) {
                    console.log('error: ');
                    console.log(err);
                });
            }
        }
        typeName($nschemaType, $nschema, namespace, name, context) {
            let result;
            var typeMap = function (t) {
                switch (t) {
                    case 'int':
                        return 'number';
                    case 'float':
                        return 'number';
                    case 'string':
                        return 'string';
                    case 'bool':
                        return 'boolean';
                    case 'Date':
                        return 'Date';
                }
                return 'string';
            };
            if ((typeof ($nschemaType)) === 'string') {
                result = typeMap($nschemaType);
            }
            else if (typeof ($nschemaType) === 'object') {
                var ns = $nschemaType.namespace;
                if (typeof (ns) === 'undefined') {
                    ns = namespace || '';
                }
                if (ns !== namespace) {
                    if (!context.imports[ns]) {
                        context.imports[ns] = {};
                    }
                    context.imports[ns][$nschemaType.name] = true;
                }
                result = $nschemaType.name;
            }
            else {
                result = typeMap('string');
            }
            if ($nschemaType && $nschemaType.modifier) {
                let $modifier = $nschemaType.modifier;
                let modifierArr;
                if (!$nschema.isArray($modifier)) {
                    modifierArr = [$modifier];
                }
                else {
                    modifierArr = $modifier;
                }
                modifierArr.forEach(function (item) {
                    result += ' ' + modifierMap(item);
                });
            }
            return result;
        }
    }
    exports.TypeScript = TypeScript;
    let typescript = new TypeScript();
    exports.default = typescript;
});
//# sourceMappingURL=typescript.js.map