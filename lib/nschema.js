(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "fs", "path", "ejs", "ninejs/core/deferredUtils"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    const fs = require("fs");
    const path = require("path");
    const ejs = require("ejs");
    const deferredUtils_1 = require("ninejs/core/deferredUtils");
    let indent = 0;
    let utils = {
        i: function (amount, seed) {
            var r = '';
            for (var cnt = 0; cnt < (amount || 0); cnt += 1) {
                r += seed;
            }
            return r;
        },
        clone: (obj) => {
            if (null == obj || "object" != typeof obj)
                return obj;
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr))
                    copy[attr] = obj[attr];
            }
            return copy;
        }
    };
    function createDirectorySync(dirpath) {
        let seps = dirpath.split(path.sep), tried = [];
        seps.forEach(item => {
            tried.push(item);
            var tryDir = tried.join(path.sep);
            if (tryDir) {
                if (!fs.existsSync(tryDir)) {
                    fs.mkdirSync(tryDir);
                }
            }
        });
    }
    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }
    function objClone(obj) {
        let cnt, len, p;
        if ((obj === null) || (obj === undefined)) {
            return obj;
        }
        if (isArray(obj)) {
            let r = [];
            len = obj.length;
            for (cnt = 0; cnt < len; cnt += 1) {
                r.push(objClone(obj[cnt]));
            }
            return r;
        }
        else if (typeof (obj) === 'object') {
            let r = {};
            for (p in obj) {
                if (obj.hasOwnProperty(p)) {
                    r[p] = objClone(obj[p]);
                }
            }
            return r;
        }
        else {
            return obj;
        }
    }
    function mixinRecursive(obj, target, filter) {
        var p;
        for (p in target) {
            if (target.hasOwnProperty(p)) {
                if (!filter || !filter(obj, target, p)) {
                    if (!isArray(obj[p]) && (!isArray(target[p])) && (typeof (obj[p]) === 'object') && (typeof (target[p]) === 'object')) {
                        mixinRecursive(obj[p], target[p]);
                    }
                    else {
                        obj[p] = target[p];
                    }
                }
            }
        }
    }
    function appendFile(filename, content, callback) {
        var dirname = path.dirname(filename);
        try {
            createDirectorySync(dirname);
            fs.appendFile(filename, content, callback);
        }
        catch (err) {
            callback(err);
        }
    }
    function registerBasicTypes(nschema) {
        [{
                '$type': 'object',
                'name': 'int',
                'namespace': '',
                'properties': {},
                'bind': {}
            }, {
                '$type': 'object',
                'name': 'float',
                'namespace': '',
                'properties': {},
                'bind': {}
            }, {
                '$type': 'object',
                'name': 'string',
                'namespace': '',
                'properties': {},
                'bind': {}
            }, {
                '$type': 'object',
                'name': 'boolean',
                'namespace': '',
                'properties': {},
                'bind': {}
            }]
            .forEach(nschema
            .registerObject
            .bind(nschema));
    }
    class NSchema {
        constructor() {
            this.dirname = __dirname;
            this.sources = {};
            this.targets = [];
            this.customPlugins = {};
            this.types = {};
            this.context = {
                objects: [],
                messages: [],
                services: []
            };
            this.dotSettings = {};
            this.path = path;
            this.isArray = isArray;
            this.objClone = objClone;
            this.mixinRecursive = mixinRecursive;
            this.appendFile = appendFile;
            this.ejs = ejs;
            this.ejsSettings = {
                debug: false,
                client: true,
                open: '<%',
                close: '%>'
            };
            this.utils = {
                initialCaps: function (n) {
                    if (!n) {
                        return n;
                    }
                    return n[0].toUpperCase() + n.substr(1);
                }
            };
            this.mixinRecursive(this.dotSettings, this.ejsSettings);
            this.mixinRecursive(this.dotSettings, {});
            registerBasicTypes(this);
        }
        register(type, obj) {
            switch (type) {
                case 'source':
                    throw new Error('Cannot register source. Call registerSource() directly');
                case 'target':
                    throw new Error('Cannot register target. Call registerTarget() directly');
                case 'service':
                case 'message':
                case 'object':
                    throw new Error(`Cannot register ${type}.`);
                case 'type':
                    this.types[obj.name] = obj;
                    break;
                default:
                    if (!this.customPlugins[type]) {
                        this.customPlugins[type] = [];
                    }
                    this.customPlugins[type].push(obj);
                    break;
            }
            return Promise.resolve(null);
        }
        registerSource(obj) {
            this.sources[obj.name] = obj;
            return Promise.resolve(null);
        }
        registerTarget(obj) {
            this.targets.push(obj);
            return Promise.resolve(null);
        }
        registerService(serviceConfig) {
            var t = this.getService(serviceConfig.namespace, serviceConfig.name);
            if (t && !t.$nschemaRegistered) {
                throw new Error('service ' + (serviceConfig.namespace || '') + '::' + (serviceConfig.name || '') + ' already exists');
            }
            this.context.services.push(serviceConfig);
            serviceConfig.$nschemaRegistered = true;
        }
        registerObject(typeConfig) {
            var t = this.getObject(typeConfig.namespace, typeConfig.name);
            if (t && !t.$nschemaRegistered) {
                throw new Error('type ' + (typeConfig.namespace || '') + '::' + (typeConfig.name || '') + ' already exists');
            }
            this.context.objects.push(typeConfig);
            typeConfig.$nschemaRegistered = true;
        }
        getObject(ns, name) {
            var r = this.context.objects.filter(function (t) {
                return ((t.namespace || '') === (ns || '')) && ((t.name || '') === (name || ''));
            });
            if (r.length) {
                return r[0];
            }
            return null;
        }
        getMessage(ns, name) {
            var r = this.context.messages.filter(function (t) {
                return ((t.namespace || '') === (ns || '')) && ((t.name || '') === (name || ''));
            });
            if (r.length) {
                return r[0];
            }
            return null;
        }
        registerMessage(typeConfig) {
            var t = this.getMessage(typeConfig.namespace, typeConfig.name);
            if (t && !t.$nschemaRegistered) {
                throw new Error('message ' + (typeConfig.namespace || '') + '::' + (typeConfig.name || '') + ' already exists');
            }
            this.context.messages.push(typeConfig);
            typeConfig.$nschemaRegistered = true;
        }
        getService(ns, name) {
            var r = this.context.services.filter(function (t) {
                return ((t.namespace || '') === (ns || '')) && ((t.name || '') === (name || ''));
            });
            if (r.length) {
                return r[0];
            }
            return null;
        }
        getCustomPlugin(name, obj) {
            function isValidProperty(k) {
                return k !== 'location' && (k.indexOf('$') !== 0);
            }
            let getCriteria = function (obj) {
                return Object
                    .keys(obj)
                    .filter(isValidProperty)
                    .map(function (k) {
                    return k + ' = \'' + obj[k] + '\'';
                })
                    .join(' AND ');
            }, customPlugins = (this.customPlugins[name] || []).filter((target) => {
                let tgt = target;
                var p;
                for (p in obj) {
                    if (obj.hasOwnProperty(p) && isValidProperty(p)) {
                        if ((tgt[p] !== obj[p]) && (tgt[p] !== '*')) {
                            return false;
                        }
                    }
                }
                return true;
            });
            if (customPlugins.length > 1) {
                throw new Error(`Warning: multiple plugins found for ${getCriteria(obj)}.`);
            }
            else if (customPlugins.length === 1) {
                return customPlugins[0];
            }
            else {
                return null;
            }
        }
        getTarget(obj) {
            function isValidProperty(k) {
                return k !== 'location' && (k.indexOf('$') !== 0);
            }
            var getCriteria = function (obj) {
                return Object
                    .keys(obj)
                    .filter(isValidProperty)
                    .map(function (k) {
                    return k + ' = \'' + obj[k] + '\'';
                })
                    .join(' AND ');
            }, targets = this.targets.filter((target) => {
                let tgt = target;
                var p;
                for (p in obj) {
                    if (obj.hasOwnProperty(p) && isValidProperty(p)) {
                        if (tgt[p] !== obj[p]) {
                            return false;
                        }
                    }
                }
                return true;
            });
            if (targets.length > 1) {
                throw new Error('multiple targets for: ' + getCriteria(obj));
            }
            else if (targets.length === 1) {
                return targets[0];
            }
            else {
                throw new Error('Unsupported target: ' + getCriteria(obj));
            }
        }
        buildTemplate(filename) {
            var tpl = fs.readFileSync(filename, { encoding: 'utf-8' });
            this.dotSettings.filename = filename;
            var compiled = ejs.compile(tpl, this.dotSettings);
            return compiled;
        }
        writeFile(filename, content) {
            var dirname = path.dirname(filename);
            createDirectorySync(dirname);
            let result = deferredUtils_1.defer();
            fs.writeFile(filename, content, (err, data) => {
                if (err) {
                    result.reject(err);
                }
                else {
                    result.resolve(data);
                }
            });
            return result.promise;
        }
        init(loadPath) {
            let self, providerPath;
            if (this.loadDefer) {
                return this.loadDefer;
            }
            else {
                self = this;
                providerPath = (!!loadPath) ? loadPath : path.resolve(__dirname, 'provider');
                this.loadDefer = deferredUtils_1.all(fs
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
                    .filter(function (d) {
                    var dir = path.resolve(providerPath, d), basename = path.basename(dir);
                    return fs.existsSync(path.resolve(dir, basename + '.js'));
                })
                    .map(function (d) {
                    var dir = path.resolve(providerPath, d), basename = path.basename(dir);
                    return path.resolve(dir, basename);
                })
                    .map(require)
                    .map(function (m) {
                    if (m['default']) {
                        m = m['default'];
                    }
                    return m.init(self);
                }))
                    .catch(function (err) {
                    console.log(err);
                    throw err;
                })
                    .then(function () {
                    return self;
                });
                return this.loadDefer;
            }
        }
        generate(parentConfig, config) {
            if (!config) {
                config = {};
                mixinRecursive(config, parentConfig);
                parentConfig = this.globalConfig || {};
            }
            config.i = indent;
            config.$u = utils;
            var type = config.$type, typeProvider;
            if (this.verbose) {
                console.log('loading nschema provider: ' + type);
            }
            typeProvider = this.types[type];
            if (!typeProvider) {
                throw new Error('Unknown nschema type provider: ' + type);
            }
            parentConfig = objClone(parentConfig);
            mixinRecursive(parentConfig, config);
            return typeProvider.execute(parentConfig, this);
        }
        walk(dir, done) {
            var results = [];
            let self = this;
            fs.readdir(dir, function (err, list) {
                if (err) {
                    return done(err);
                }
                var i = 0;
                (function next() {
                    var file = list[i];
                    i += 1;
                    if (!file) {
                        return done(null, results);
                    }
                    file = dir + '/' + file;
                    fs.stat(file, function (err, stat) {
                        if (stat && stat.isDirectory()) {
                            self.walk(file, function (err, res) {
                                results = results.concat(res);
                                next();
                            });
                        }
                        else {
                            results.push(file);
                            next();
                        }
                    });
                })();
            });
        }
    }
    exports.default = NSchema;
    function generate(parentConfig, config) {
        var n = new NSchema();
        return n
            .init()
            .catch(function (err) {
            console.log('failed to load NSchema');
            console.log(err);
            throw err;
        })
            .then(function (nschema) {
            return nschema.generate(parentConfig, config);
        })
            .catch((err) => {
            console.log('NSchema failed to generate');
            console.log(err);
            if (err.stack) {
                console.log(err.stack);
            }
            throw err;
        });
    }
    exports.generate = generate;
    ;
    function features() {
        var n = new NSchema();
        return n
            .init()
            .catch(function (err) {
            console.log('failed to load NSchema');
            console.log(err);
            throw err;
        })
            .then(function (nschema) {
            let version = require('../package.json').version;
            console.log(`NineSchema version ${version}`);
            console.log();
            console.log('Available bindings:');
            console.log();
            nschema.targets.forEach(target => {
                console.log(`	serviceType: '${target.serviceType}'`);
                console.log(`	language: '${target.language}'`);
                console.log(`	bind: '${target.bind}'`);
                console.log(`	description: ${target.description || 'No description provided'}`);
                console.log();
            });
        });
    }
    exports.features = features;
});
//# sourceMappingURL=nschema.js.map