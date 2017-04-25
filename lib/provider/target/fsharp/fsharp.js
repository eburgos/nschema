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
    class FSharp {
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
                m.fsharp = self;
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
        generate(nschema, nsconfig, template, target) {
            let config = nsconfig;
            config.$nschema = nschema;
            config.$fsharp = this;
            config.$target = target;
            var result = template(config);
            var filepath, location = target.location;
            if (location.indexOf('.') === 0) {
                filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.fs')));
            }
            else {
                filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.fs')));
            }
            console.log('writing to file: ' + filepath);
            return nschema.writeFile(filepath, result).then(null, function (err) {
                console.log('error: ');
                console.log(err);
            });
        }
        typeName($nschemaType, $nschema, namespace) {
            let result;
            var typeMap = function (t) {
                switch (t) {
                    case 'int':
                        return 'int';
                    case 'float':
                        return 'float';
                    case 'string':
                        return 'string';
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
                result = ns + '.' + $nschemaType.name;
            }
            else {
                result = typeMap('string');
            }
            if ($nschemaType.modifier) {
                let $modifier = $nschemaType.modifier;
                let modifierArr;
                if (!$nschema.isArray($modifier)) {
                    modifierArr = [$modifier];
                }
                else {
                    modifierArr = $modifier;
                }
                modifierArr.forEach(function (item) {
                    result += ' ' + item;
                });
            }
            return result;
        }
    }
    exports.FSharp = FSharp;
    let fsharp = new FSharp();
    exports.default = fsharp;
});
//# sourceMappingURL=fsharp.js.map