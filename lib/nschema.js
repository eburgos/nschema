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
const fs = require("fs");
const path_1 = require("path");
const logging_1 = require("./logging");
const utils_1 = require("./utils");
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
function appendFile(filename, content, callback) {
    const dirname = path_1.dirname(filename);
    try {
        createDirectorySync(dirname);
        fs.appendFile(filename, content, callback);
    }
    catch (err) {
        callback(err);
    }
}
function isValidProperty(k) {
    return k !== "location" && k.indexOf("$") !== 0;
}
const getCriteria = (obj) => {
    return Object.keys(obj)
        .filter(isValidProperty)
        .map(k => {
        return `${k} = '${obj[k]}'`;
    })
        .join(" AND ");
};
function registerBasicTypes(nschema) {
    const basics = [
        {
            $type: "object",
            name: "int",
            namespace: ""
        },
        {
            $type: "object",
            name: "float",
            namespace: ""
        },
        {
            $type: "object",
            name: "string",
            namespace: ""
        },
        {
            $type: "object",
            name: "boolean",
            namespace: ""
        }
    ];
    basics.forEach(item => nschema.registerObject(item));
}
const allowedParentToChildrenMixin = {
    $importLocation: true,
    $nschemaLocation: true,
    $u: true,
    namespace: true
};
class NSchema {
    constructor() {
        this.appendFile = appendFile;
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
        this.$context = {
            messages: [],
            objects: [],
            services: []
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
    context() {
        return this.$context;
    }
    generate(parentConfig, config, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const type = config.$type;
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
                if (obj.hasOwnProperty(p) && isValidProperty(p)) {
                    if (typeof tgt[p] === "function") {
                        return tgt[p](obj[p]);
                    }
                    else if (tgt[p] !== obj[p] && tgt[p] !== "*") {
                        return false;
                    }
                }
            }
            return true;
        });
        if (customPlugins.length > 1) {
            throw new Error(`Error: multiple plugins found for ${getCriteria(obj)}.
        ${customPlugins.map(p => JSON.stringify(p, null, 2)).join("\n")}`);
        }
        else if (customPlugins.length === 1) {
            return customPlugins[0];
        }
        else {
            return undefined;
        }
    }
    getMessage(ns, name) {
        const r = this.context().messages.filter(t => {
            return ((t.namespace || "") === (ns || "") && (t.name || "") === (name || ""));
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
    }
    getObject(ns, name) {
        const r = this.context().objects.filter(t => {
            return ((t.namespace || "") === (ns || "") && (t.name || "") === (name || ""));
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
    }
    getService(ns, name) {
        const r = this.context().services.filter(t => {
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
                if (obj.hasOwnProperty(p) && isValidProperty(p)) {
                    if (tgt[p] !== obj[p]) {
                        return false;
                    }
                }
            }
            return true;
        });
        if (targets.length > 1) {
            throw new Error(`multiple targets for: ${getCriteria(obj)}`);
        }
        else if (targets.length === 1) {
            return targets[0];
        }
        else {
            throw new Error(`Unsupported target: ${getCriteria(obj)}`);
        }
    }
    init(loadPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const self = this;
            const providerPath = !!loadPath
                ? loadPath
                : path_1.resolve(__dirname, "provider");
            if (this.loadDefer) {
                return this.loadDefer;
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
                }))
                    .catch(err => {
                    console.error(err);
                    throw err;
                })
                    .then(() => {
                    return self;
                });
                return this.loadDefer;
            }
        });
    }
    register(type, obj) {
        return __awaiter(this, void 0, void 0, function* () {
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
            this.context().messages.push(typeConfig);
        }
    }
    registerObject(typeConfig) {
        const t = this.getObject(typeConfig.namespace || "", typeConfig.name);
        if (!t) {
            this.context().objects.push(typeConfig);
        }
    }
    registerService(serviceConfig) {
        const t = this.getService(serviceConfig.namespace || "", serviceConfig.name);
        if (!t) {
            this.context().services.push(serviceConfig);
        }
    }
    registerSource(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            this.sources[obj.name] = obj;
            return yield Promise.resolve(null);
        });
    }
    registerTarget(obj) {
        return __awaiter(this, void 0, void 0, function* () {
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
                fs.stat(file, ($err, stat) => {
                    if ($err) {
                        logging_1.writeError($err);
                        throw $err;
                    }
                    if (stat && stat.isDirectory()) {
                        self.walk(file, ($err2, res) => {
                            if ($err2) {
                                logging_1.writeError($err2);
                                throw $err2;
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
        return __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
        const n = new NSchema();
        try {
            const nschema = yield n.init();
            try {
                return yield nschema.generate(parentConfig, config, undefined);
            }
            catch (err) {
                logging_1.writeError("NSchema failed to generate");
                logging_1.writeError(err);
                throw err;
            }
        }
        catch (err) {
            logging_1.writeError("failed to load NSchema");
            logging_1.writeError(err);
            throw err;
        }
    });
}
exports.generate = generate;
function features() {
    return __awaiter(this, void 0, void 0, function* () {
        const n = new NSchema();
        try {
            const nschema = yield n.init();
            const version = require("../package.json").version;
            logging_1.writeLog(logging_1.LogLevel.Default, `NineSchema version ${version}`);
            logging_1.writeLog(logging_1.LogLevel.Default, "");
            logging_1.writeLog(logging_1.LogLevel.Default, "Available bindings:");
            logging_1.writeLog(logging_1.LogLevel.Default, "");
            nschema.targets.forEach(target => {
                logging_1.writeLog(logging_1.LogLevel.Default, `	serviceType: '${target.serviceType}'`);
                logging_1.writeLog(logging_1.LogLevel.Default, `	language: '${target.language}'`);
                logging_1.writeLog(logging_1.LogLevel.Default, `	bind: '${target.bind}'`);
                logging_1.writeLog(logging_1.LogLevel.Default, `	description: ${target.description || "No description provided"}`);
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
        $nschemaLocation: nschemaLocation,
        $type: "bundle",
        list: []
    };
}
exports.getConfig = getConfig;
