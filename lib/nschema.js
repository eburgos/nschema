"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = require("fs");
const path_1 = require("path");
const logging_1 = require("./logging");
const utils_1 = require("./utils");
const chalk_1 = require("chalk");
function createDirectorySync(dirpath) {
    const seps = dirpath.split(path_1.sep);
    const tried = [];
    seps.forEach(item => {
        tried.push(item);
        const tryDir = tried.join(path_1.sep);
        if (tryDir) {
            if (!fs.existsSync(tryDir)) {
                fs.mkdirSync(tryDir);
            }
        }
    });
}
function isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
}
function mixinRecursive(mixedInto, from, filter) {
    for (const p in from) {
        if (from.hasOwnProperty(p)) {
            if (!filter || !filter(mixedInto, from, p)) {
                if (!isArray(mixedInto[p]) &&
                    !isArray(from[p]) &&
                    typeof mixedInto[p] === "object" &&
                    typeof from[p] === "object") {
                    mixinRecursive(mixedInto[p], from[p]);
                }
                else {
                    mixedInto[p] = from[p];
                }
            }
        }
    }
}
function registerBasicTypes(nschema) {
    const basics = [
        {
            name: "int",
            namespace: "",
            type: "object"
        },
        {
            name: "float",
            namespace: "",
            type: "object"
        },
        {
            name: "string",
            namespace: "",
            type: "object"
        },
        {
            name: "boolean",
            namespace: "",
            type: "object"
        }
    ];
    basics.forEach(item => nschema.registerObject(item));
}
const allowedParentToChildrenMixin = {
    importLocation: true,
    namespace: true,
    nschemaLocation: true
};
class NSchema {
    constructor() {
        this.context = {
            messages: [],
            objects: [],
            services: []
        };
        this.ejsSettings = {
            client: true,
            close: "%>",
            debug: false,
            open: "<%"
        };
        this.isArray = isArray;
        this.mixinRecursive = mixinRecursive;
        this.require = undefined;
        this.targets = [];
        this.utils = {
            initialCaps: utils_1.initialCaps
        };
        this.customPlugins = {};
        this.dotSettings = {};
        this.loadDefer = undefined;
        this.mTypes = {};
        this.sources = {};
        this.mixinRecursive(this.dotSettings, this.ejsSettings);
        this.mixinRecursive(this.dotSettings, {});
        registerBasicTypes(this);
    }
    generate(parentConfig, config, context) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const type = config.type;
            const typeProvider = this.types()[type];
            if (!typeProvider) {
                throw new Error(`Unknown nschema type provider: ${type}`);
            }
            const newConfigCloned = utils_1.deepClone(config);
            mixinRecursive(newConfigCloned, parentConfig, (_a, _b, prop) => {
                return !allowedParentToChildrenMixin[prop];
            });
            const newConfig = utils_1.appendTarget(utils_1.propagateTarget(newConfigCloned, parentConfig));
            if (typeProvider.execute) {
                logging_1.writeDebugLog(`executing ${newConfig.namespace || ""} :: ${newConfig
                    .name || ""} with provider ${typeProvider.name}`);
                return yield typeProvider.execute(newConfig, this, context);
            }
            else {
                return yield Promise.resolve();
            }
        });
    }
    getCustomPlugin(name, obj) {
        const customPlugins = (this.customPlugins[name] || []).filter((target) => {
            const tgt = target;
            for (const p in obj) {
                if (obj.hasOwnProperty(p) && utils_1.isValidCriteriaProperty(p)) {
                    if (typeof tgt[p] === "function") {
                        if (!tgt[p](obj[p])) {
                            return false;
                        }
                    }
                    else if (tgt[p] !== obj[p] && tgt[p] !== "*") {
                        return false;
                    }
                }
            }
            return true;
        });
        return customPlugins;
    }
    getMessage(ns, name) {
        const r = this.context.messages.filter(t => {
            return ((t.namespace || "") === (ns || "") && (t.name || "") === (name || ""));
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
    }
    getObject(ns, name) {
        const r = this.context.objects.filter(t => {
            return ((t.namespace || "") === (ns || "") && (t.name || "") === (name || ""));
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
    }
    getService(ns, name) {
        const r = this.context.services.filter(t => {
            return (t.namespace || "") === ns && (t.name || "") === name;
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
    }
    getTarget(obj) {
        const targets = this.targets.filter((target) => {
            const tgt = target;
            for (const p in obj) {
                if (obj.hasOwnProperty(p) && utils_1.isValidCriteriaProperty(p)) {
                    if (tgt[p] !== obj[p]) {
                        return false;
                    }
                }
            }
            return true;
        });
        return targets;
    }
    init(loadPath) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const self = this;
            const providerPath = !!loadPath
                ? loadPath
                : path_1.resolve(__dirname, "provider");
            if (this.loadDefer) {
                yield this.loadDefer;
                return self;
            }
            else {
                this.loadDefer = Promise.all(fs
                    .readdirSync(providerPath)
                    .filter((item) => {
                    return fs.statSync(path_1.resolve(providerPath, item)).isDirectory();
                })
                    .map((d) => {
                    return fs
                        .readdirSync(path_1.resolve(providerPath, d))
                        .map((i) => {
                        return path_1.resolve(providerPath, d, i);
                    });
                })
                    .reduce((a, b) => {
                    return a.concat(b);
                })
                    .filter((d) => {
                    const dir = path_1.resolve(providerPath, d);
                    const basename = "index";
                    return fs.existsSync(path_1.resolve(dir, `${basename}.js`));
                })
                    .map((d) => {
                    const dir = path_1.resolve(providerPath, d);
                    const basename = "index";
                    return path_1.resolve(dir, basename);
                })
                    .map(require)
                    .map(m => {
                    if (m.default) {
                        m = m.default;
                    }
                    return m.init(self);
                }));
                try {
                    yield this.loadDefer;
                    return self;
                }
                catch (err) {
                    throw err;
                }
            }
        });
    }
    register(type, obj) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            switch (type) {
                case "source":
                    throw new Error("Cannot register source. Call registerSource() directly");
                case "target":
                    throw new Error("Cannot register target. Call registerTarget() directly");
                case "service":
                case "message":
                case "object":
                    throw new Error(`Cannot register ${type}.`);
                case "type":
                    this.types()[obj.name] = obj;
                    break;
                default:
                    if (!this.customPlugins[type]) {
                        this.customPlugins[type] = [];
                    }
                    this.customPlugins[type].push(obj);
                    break;
            }
            return yield Promise.resolve(null);
        });
    }
    registerMessage(typeConfig) {
        const t = this.getMessage(typeConfig.namespace || "", typeConfig.name || "");
        if (!t) {
            this.context.messages.push(typeConfig);
        }
    }
    registerObject(typeConfig) {
        const t = this.getObject(typeConfig.namespace || "", typeConfig.name);
        if (!t) {
            this.context.objects.push(typeConfig);
        }
    }
    registerService(serviceConfig) {
        const t = this.getService(serviceConfig.namespace || "", serviceConfig.name);
        if (!t) {
            this.context.services.push(serviceConfig);
        }
    }
    registerSource(obj) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.sources[obj.name] = obj;
            return yield Promise.resolve(null);
        });
    }
    registerTarget(obj) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.targets.push(obj);
            return yield Promise.resolve(null);
        });
    }
    types() {
        return this.mTypes;
    }
    walk(dir, done) {
        let results = [];
        const self = this;
        fs.readdir(dir, (err, list) => {
            if (err) {
                return done(err);
            }
            let i = 0;
            (function next() {
                let file = list[i];
                i += 1;
                if (!file) {
                    return done(undefined, results);
                }
                file = `${dir}/${file}`;
                fs.stat(file, (err2, stat) => {
                    if (err2) {
                        logging_1.writeError(err2);
                        throw err2;
                    }
                    if (stat && stat.isDirectory()) {
                        self.walk(file, (err3, res) => {
                            if (err3) {
                                logging_1.writeError(err3);
                                throw err3;
                            }
                            if (res) {
                                results = results.concat(res);
                            }
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
    writeFile(filename, content) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const dirname = path_1.dirname(filename);
            createDirectorySync(dirname);
            return yield new Promise((resolve, reject) => {
                fs.writeFile(filename, content, null, (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
}
exports.default = NSchema;
function generate(parentConfig, config) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const n = new NSchema();
        const nschema = yield (() => tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                return yield n.init();
            }
            catch (err) {
                return undefined;
            }
        }))();
        if (!nschema) {
            logging_1.writeError("failed to load NSchema");
        }
        else {
            try {
                return yield nschema.generate(parentConfig, config, {});
            }
            catch (err) {
                logging_1.writeError("NSchema failed to generate");
                throw err;
            }
        }
    });
}
exports.generate = generate;
function groupBy(keyGrouper, lst) {
    return lst.reduce((acc, next) => {
        const key = keyGrouper(next);
        if (!acc.has(key)) {
            acc.set(key, []);
        }
        const groupList = acc.get(key);
        if (groupList) {
            groupList.push(next);
        }
        return acc;
    }, new Map());
}
function features() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const n = new NSchema();
        try {
            const nschema = yield n.init();
            const version = require("../package.json").version;
            logging_1.writeLog(logging_1.LogLevel.Default, `NineSchema version ${version}`);
            logging_1.writeLog(logging_1.LogLevel.Default, "");
            logging_1.writeLog(logging_1.LogLevel.Default, "Available targets:");
            logging_1.writeLog(logging_1.LogLevel.Default, "");
            const typeGroups = groupBy(item => item.type, nschema.targets);
            typeGroups.forEach((list, type) => {
                logging_1.writeLog(logging_1.LogLevel.Default, `type: ${chalk_1.default.blue(type)}`);
                console.table(list.map(target => {
                    if (type === "object") {
                        return {
                            type: target.type,
                            language: target.language,
                            name: target.name,
                            description: target.description
                        };
                    }
                    else {
                        return {
                            type: target.type,
                            language: target.language,
                            serviceType: target.serviceType || null,
                            bind: target.bind || null,
                            name: target.name,
                            description: target.description
                        };
                    }
                }));
                logging_1.writeLog(logging_1.LogLevel.Default, "");
            });
        }
        catch (err) {
            logging_1.writeError("failed to load NSchema");
            logging_1.writeError(err);
            throw err;
        }
    });
}
exports.features = features;
function getConfig(nschemaLocation) {
    return {
        list: [],
        nschemaLocation,
        type: "bundle"
    };
}
exports.getConfig = getConfig;
