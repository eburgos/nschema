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
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const logging_1 = require("./logging");
const utils = {
    relativePath: path.relative,
    resolvePath: path.resolve,
    i(amount, seed) {
        let r = "";
        for (let cnt = 0; cnt < (amount || 0); cnt += 1) {
            r += seed;
        }
        return r;
    },
    clone(obj) {
        if (null == obj || "object" !== typeof obj) {
            return obj;
        }
        const copy = {};
        for (const attr in obj) {
            if (obj.hasOwnProperty(attr)) {
                copy[attr] = obj[attr];
            }
        }
        return copy;
    }
};
function createDirectorySync(dirpath) {
    const seps = dirpath.split(path.sep);
    const tried = [];
    seps.forEach(item => {
        tried.push(item);
        const tryDir = tried.join(path.sep);
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
function objClone(obj) {
    let cnt;
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (isArray(obj)) {
        const r = [];
        const len = obj.length;
        for (cnt = 0; cnt < len; cnt += 1) {
            r.push(objClone(obj[cnt]));
        }
        return r;
    }
    else if (typeof obj === "object") {
        const r = {};
        for (const p in obj) {
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
    for (const p in target) {
        if (target.hasOwnProperty(p)) {
            if (!filter || !filter(obj, target, p)) {
                if (!isArray(obj[p]) &&
                    !isArray(target[p]) &&
                    typeof obj[p] === "object" &&
                    typeof target[p] === "object") {
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
    const dirname = path.dirname(filename);
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
    [
        {
            $type: "object",
            bind: {},
            name: "int",
            namespace: "",
            properties: {}
        },
        {
            $type: "object",
            bind: {},
            name: "float",
            namespace: "",
            properties: {}
        },
        {
            $type: "object",
            bind: {},
            name: "string",
            namespace: "",
            properties: {}
        },
        {
            $type: "object",
            bind: {},
            name: "boolean",
            namespace: "",
            properties: {}
        }
    ].forEach(nschema.registerObject.bind(nschema));
}
class NSchema {
    constructor() {
        this.path = path;
        this.isArray = isArray;
        this.objClone = objClone;
        this.require = undefined;
        this.mixinRecursive = mixinRecursive;
        this.appendFile = appendFile;
        this.ejs = ejs;
        this.ejsSettings = {
            client: true,
            close: "%>",
            debug: false,
            open: "<%"
        };
        this.utils = {
            initialCaps(n) {
                if (!n) {
                    return n;
                }
                return n[0].toUpperCase() + n.substr(1);
            }
        };
        this.targets = [];
        this.sources = {};
        this.customPlugins = {};
        this.dotSettings = {};
        this.loadDefer = undefined;
        this.globalConfig = undefined;
        this.mTypes = {};
        this.mContext = {
            messages: [],
            objects: [],
            services: []
        };
        this.mixinRecursive(this.dotSettings, this.ejsSettings);
        this.mixinRecursive(this.dotSettings, {});
        registerBasicTypes(this);
    }
    types() {
        return this.mTypes;
    }
    context() {
        return this.mContext;
    }
    register(type, obj) {
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
        const t = this.getService(serviceConfig.namespace || "", serviceConfig.name);
        if (t && !t.$nschemaRegistered) {
            throw new Error(`service ${serviceConfig.namespace || ""}::${serviceConfig.name ||
                ""} already exists`);
        }
        this.context().services.push(serviceConfig);
        serviceConfig.$nschemaRegistered = true;
    }
    registerObject(typeConfig) {
        const t = this.getObject(typeConfig.namespace || "", typeConfig.name);
        if (t && !t.$nschemaRegistered) {
            throw new Error(`type ${typeConfig.namespace || ""}::${typeConfig.name ||
                ""} already exists`);
        }
        this.context().objects.push(typeConfig);
        typeConfig.$nschemaRegistered = true;
    }
    getObject(ns, name) {
        const r = this.context().objects.filter((t) => {
            return ((t.namespace || "") === (ns || "") && (t.name || "") === (name || ""));
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
    }
    getMessage(ns, name) {
        const r = this.context().messages.filter((t) => {
            return ((t.namespace || "") === (ns || "") && (t.name || "") === (name || ""));
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
    }
    registerMessage(typeConfig) {
        const t = this.getMessage(typeConfig.namespace || "", typeConfig.name);
        if (t && !t.$nschemaRegistered) {
            throw new Error(`message ${typeConfig.namespace || ""}::${typeConfig.name ||
                ""} already exists`);
        }
        this.context().messages.push(typeConfig);
        typeConfig.$nschemaRegistered = true;
    }
    getService(ns, name) {
        const r = this.context().services.filter((t) => {
            return (t.namespace || "") === ns && (t.name || "") === name;
        });
        if (r.length) {
            return r[0];
        }
        return undefined;
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
            throw new Error(`Warning: multiple plugins found for ${getCriteria(obj)}.`);
        }
        else if (customPlugins.length === 1) {
            return customPlugins[0];
        }
        else {
            return undefined;
        }
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
    buildTemplate(filename) {
        const tpl = fs.readFileSync(filename, { encoding: "utf-8" });
        this.dotSettings.filename = filename;
        const compiled = ejs.compile(tpl, this.dotSettings);
        return compiled;
    }
    writeFile(filename, content) {
        const dirname = path.dirname(filename);
        createDirectorySync(dirname);
        return new Promise((resolve, reject) => {
            fs.writeFile(filename, content, null, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    init(loadPath) {
        const self = this;
        const providerPath = !!loadPath
            ? loadPath
            : path.resolve(__dirname, "provider");
        if (this.loadDefer) {
            return this.loadDefer;
        }
        else {
            this.loadDefer = Promise.all(fs
                .readdirSync(providerPath)
                .filter((item) => {
                return fs.statSync(path.resolve(providerPath, item)).isDirectory();
            })
                .map((d) => {
                return fs
                    .readdirSync(path.resolve(providerPath, d))
                    .map((i) => {
                    return path.resolve(providerPath, d, i);
                });
            })
                .reduce((a, b) => {
                return a.concat(b);
            })
                .filter((d) => {
                const dir = path.resolve(providerPath, d);
                const basename = path.basename(dir);
                return fs.existsSync(path.resolve(dir, `${basename}.js`));
            })
                .map((d) => {
                const dir = path.resolve(providerPath, d);
                const basename = path.basename(dir);
                return path.resolve(dir, basename);
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
    }
    generate(parentConfig, config, context) {
        config.i = 0;
        config.$u = utils;
        const type = config.$type || "";
        const typeProvider = this.types()[type];
        if (!typeProvider) {
            throw new Error(`Unknown nschema type provider: ${type}`);
        }
        const newConfig = objClone(parentConfig);
        mixinRecursive(newConfig, config);
        if (typeProvider.execute) {
            return typeProvider.execute(newConfig, this, context);
        }
        else {
            return Promise.resolve();
        }
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
                    if (stat && stat.isDirectory()) {
                        self.walk(file, ($err2, res) => {
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
    const n = new NSchema();
    return n
        .init()
        .catch((err) => {
        logging_1.writeError("failed to load NSchema");
        logging_1.writeError(err);
        throw err;
    })
        .then((nschema) => {
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
    });
}
exports.features = features;
function getConfig(nschemaLocation) {
    return { $nschemaLocation: nschemaLocation, i: 0, $u: utils };
}
exports.getConfig = getConfig;
//# sourceMappingURL=nschema.js.map