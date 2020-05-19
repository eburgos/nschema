"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = exports.features = exports.generate = void 0;
const fs = require("fs");
const path_1 = require("path");
const logging_1 = require("./logging");
const utils_1 = require("./utils");
const chalk = require("chalk");
function createDirectorySync(dirpath) {
    const seps = dirpath.split(path_1.sep);
    const tried = [];
    seps.forEach((item) => {
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
    for (const property in from) {
        if (Object.prototype.hasOwnProperty.call(from, property)) {
            if (!filter || !filter(mixedInto, from, property)) {
                if (!isArray(mixedInto[property]) &&
                    !isArray(from[property]) &&
                    typeof mixedInto[property] === "object" &&
                    typeof from[property] === "object") {
                    mixinRecursive(mixedInto[property], from[property]);
                }
                else {
                    mixedInto[property] = from[property];
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
    basics.forEach((item) => nschema.registerObject(item));
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
    async generate(parentConfig, config, context) {
        const type = config.type;
        const typeProvider = this.types()[type];
        if (!typeProvider) {
            throw new Error(`Unknown nschema type provider: ${type}`);
        }
        const newConfigCloned = utils_1.deepClone(config);
        mixinRecursive(newConfigCloned, parentConfig, (_intoProperty, _fromProperty, propertyName) => {
            return !allowedParentToChildrenMixin[propertyName];
        });
        const newConfig = utils_1.appendTarget(utils_1.propagateTarget(newConfigCloned, parentConfig));
        if (typeProvider.execute) {
            logging_1.writeDebugLog(`executing ${newConfig.namespace || ""} :: ${newConfig.name || ""} with provider ${typeProvider.name}`);
            return await typeProvider.execute(newConfig, this, context);
        }
        else {
            return await Promise.resolve();
        }
    }
    getCustomPlugin(name, obj) {
        const customPlugins = (this.customPlugins[name] || []).filter((target) => {
            const tgt = target;
            for (const property in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, property) &&
                    utils_1.isValidCriteriaProperty(property)) {
                    if (typeof tgt[property] === "function") {
                        if (!tgt[property](obj[property])) {
                            return false;
                        }
                    }
                    else if (tgt[property] !== obj[property] &&
                        tgt[property] !== "*") {
                        return false;
                    }
                }
            }
            return true;
        });
        return customPlugins;
    }
    getMessage(namespace, name) {
        const message = this.context.messages.find((message) => {
            return ((message.namespace || "") === (namespace || "") &&
                (message.name || "") === (name || ""));
        });
        return message;
    }
    getObject(namespace, name) {
        const obj = this.context.objects.find((currentObject) => {
            return ((currentObject.namespace || "") === (namespace || "") &&
                (currentObject.name || "") === (name || ""));
        });
        return obj;
    }
    getService(namespace, name) {
        const service = this.context.services.find((currentService) => {
            return ((currentService.namespace || "") === namespace &&
                (currentService.name || "") === name);
        });
        return service;
    }
    getTarget(obj) {
        const targets = this.targets.filter((target) => {
            const tgt = target;
            for (const property in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, property) &&
                    utils_1.isValidCriteriaProperty(property)) {
                    if (tgt[property] !== obj[property]) {
                        return false;
                    }
                }
            }
            return true;
        });
        return targets;
    }
    async init(loadPath) {
        const providerPath = loadPath
            ? loadPath
            : path_1.resolve(__dirname, "provider");
        if (this.loadDefer) {
            await this.loadDefer;
            return this;
        }
        else {
            this.loadDefer = Promise.all(fs
                .readdirSync(providerPath)
                .filter((item) => {
                return fs.statSync(path_1.resolve(providerPath, item)).isDirectory();
            })
                .map((directoryPath) => {
                return fs
                    .readdirSync(path_1.resolve(providerPath, directoryPath))
                    .map((item) => {
                    return path_1.resolve(providerPath, directoryPath, item);
                });
            })
                .reduce((accumulated, next) => {
                return accumulated.concat(next);
            })
                .filter((directoryPath) => {
                const dir = path_1.resolve(providerPath, directoryPath);
                const basename = "index";
                return fs.existsSync(path_1.resolve(dir, `${basename}.js`));
            })
                .map((directoryPath) => {
                const dir = path_1.resolve(providerPath, directoryPath);
                const basename = "index";
                return path_1.resolve(dir, basename);
            })
                .map(require)
                .map((requiredModule) => {
                if (requiredModule.default) {
                    requiredModule = requiredModule.default;
                }
                return requiredModule.init(this);
            }));
            await this.loadDefer;
            return this;
        }
    }
    async register(type, obj) {
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
        return await Promise.resolve(null);
    }
    registerMessage(typeConfig) {
        const message = this.getMessage(typeConfig.namespace || "", typeConfig.name || "");
        if (!message) {
            this.context.messages.push(typeConfig);
        }
    }
    registerObject(typeConfig) {
        const obj = this.getObject(typeConfig.namespace || "", typeConfig.name);
        if (!obj) {
            this.context.objects.push(typeConfig);
        }
    }
    registerService(serviceConfig) {
        const service = this.getService(serviceConfig.namespace || "", serviceConfig.name);
        if (!service) {
            this.context.services.push(serviceConfig);
        }
    }
    async registerSource(obj) {
        this.sources[obj.name] = obj;
        return await Promise.resolve(null);
    }
    async registerTarget(obj) {
        this.targets.push(obj);
        return await Promise.resolve(null);
    }
    types() {
        return this.mTypes;
    }
    walk(dir, done) {
        let results = [];
        fs.readdir(dir, (err, list) => {
            if (err) {
                return done(err);
            }
            let index = 0;
            const next = () => {
                let file = list[index];
                index += 1;
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
                        this.walk(file, (err3, res) => {
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
            };
            next();
        });
    }
    async writeFile(filename, content) {
        const dirname = path_1.dirname(filename);
        createDirectorySync(dirname);
        return await new Promise((resolve, reject) => {
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
}
exports.default = NSchema;
async function generate(parentConfig, config) {
    const nschemaInstance = new NSchema();
    const nschema = await (async () => {
        try {
            return await nschemaInstance.init();
        }
        catch (err) {
            return undefined;
        }
    })();
    if (!nschema) {
        logging_1.writeError("failed to load NSchema");
    }
    else {
        try {
            return await nschema.generate(parentConfig, config, {});
        }
        catch (err) {
            logging_1.writeError("NSchema failed to generate");
            logging_1.writeError(err);
            throw err;
        }
    }
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
async function features() {
    const nschemaInstance = new NSchema();
    try {
        const nschema = await nschemaInstance.init();
        const version = require("../package.json").version;
        logging_1.writeLog(logging_1.LogLevel.Default, `NineSchema version ${version}`);
        logging_1.writeLog(logging_1.LogLevel.Default, "");
        logging_1.writeLog(logging_1.LogLevel.Default, "Available targets:");
        logging_1.writeLog(logging_1.LogLevel.Default, "");
        const typeGroups = groupBy((item) => item.type, nschema.targets);
        typeGroups.forEach((list, type) => {
            logging_1.writeLog(logging_1.LogLevel.Default, `type: ${chalk.blue(type)}`);
            console.table(list.map((target) => {
                if (type === "object") {
                    return {
                        description: target.description,
                        language: target.language,
                        name: target.name,
                        type: target.type
                    };
                }
                else {
                    return {
                        bind: target.bind || null,
                        description: target.description,
                        language: target.language,
                        name: target.name,
                        serviceType: target.serviceType || null,
                        type: target.type
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
