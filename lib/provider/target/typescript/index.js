"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk = require("chalk");
const fs_1 = require("fs");
const path_1 = require("path");
const logging_1 = require("../../../logging");
const utils_1 = require("../../../utils");
const helpers_1 = require("./helpers");
const prettier = require("prettier");
const { blue, green, yellow } = chalk;
var RestClientStrategy;
(function (RestClientStrategy) {
    RestClientStrategy["Default"] = "Default";
    RestClientStrategy["Angular2"] = "Angular2";
})(RestClientStrategy = exports.RestClientStrategy || (exports.RestClientStrategy = {}));
class TypeScript {
    async generate(nschema, $nsconfig, template, target, providedContext) {
        const config = utils_1.deepClone($nsconfig);
        const context = Object.assign(Object.assign(Object.assign({}, buildTypeScriptContext()), providedContext), { imports: {} });
        const result = template(config, nschema, context, target);
        if (context.skipWrite) {
            logging_1.writeDebugLog(`${yellow("typescript")}: skipped write on ${target.location} - ${target.$fileName || target.name || ""} due to context`);
            return Promise.resolve({
                config,
                context,
                generated: result
            });
        }
        else {
            const location = target.location;
            const filepath = location.indexOf(".") === 0
                ? path_1.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.ts`)
                : path_1.resolve(location, config.namespace || "", config.$fileName || `${config.name}.ts`);
            logging_1.writeLog(logging_1.LogLevel.Default, `${blue("typescript")}: writing to file: ${green(filepath)}`);
            return nschema
                .writeFile(filepath, prettier.format(result, { parser: "typescript" }))
                .then(() => {
                return {
                    config,
                    context,
                    generated: result
                };
            }, err => {
                throw new Error(err);
            });
        }
    }
    async init(nschema) {
        const providerPath = path_1.resolve(__dirname, "bind");
        return Promise.all(fs_1.readdirSync(providerPath)
            .filter(item => {
            return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
        })
            .map(directory => {
            return fs_1.readdirSync(path_1.resolve(providerPath, directory)).map(dirFile => {
                return path_1.resolve(providerPath, directory, dirFile);
            });
        })
            .reduce((accumulated, next) => {
            return accumulated.concat(next);
        })
            .filter(item => {
            return path_1.extname(item) === ".js" && fs_1.existsSync(item);
        })
            .map(require)
            .map(async (requiredModule) => {
            if (requiredModule.default) {
                requiredModule = requiredModule.default;
            }
            requiredModule.typescript = this;
            return new Promise((resolve, reject) => {
                if (typeof requiredModule.init === "function") {
                    requiredModule.init(nschema).then(() => {
                        resolve(true);
                    }, (err) => {
                        reject(err);
                    });
                }
                else {
                    resolve(true);
                }
            });
        })).then(undefined, err => {
            throw new Error(err);
        });
    }
}
exports.TypeScript = TypeScript;
const typescript = new TypeScript();
let count = 0;
function buildTypeScriptContext() {
    return {
        hasTypeScript: true,
        id: count++,
        imports: {},
        skipWrite: false,
        typescript
    };
}
exports.buildTypeScriptContext = buildTypeScriptContext;
function getDataItems(nschema, nsMessage) {
    const dataItems = [];
    if (nsMessage.extends) {
        const parent = nschema.getMessage(nsMessage.extends.namespace || "", nsMessage.extends.name);
        if (parent) {
            getDataItems(nschema, parent).forEach(dataItem => {
                dataItems.push(dataItem);
            });
        }
        else {
            throw new Error(`could not find parent: ns="${nsMessage.extends.namespace ||
                ""}" name="${nsMessage.extends.name}"`);
        }
    }
    (nsMessage.data || []).map(item => {
        dataItems.push(item);
    });
    return dataItems;
}
function messageType(nschema, context, addFlowComment, message) {
    const typeSeparator = ", ";
    const dataItems = getDataItems(nschema, message);
    if (dataItems.length === 0) {
        return "void";
    }
    else if (dataItems.length === 1) {
        const item = dataItems[0];
        return `${helpers_1.typeName(item.type, nschema, "", "", context, addFlowComment, false, true)}`;
    }
    else {
        return (`{ ${dataItems
            .map((item, mapIndex) => {
            return `${item.name || `item${mapIndex}`}: ${helpers_1.typeName(item.type, nschema, "", "", context, addFlowComment, false, true)}`;
        })
            .join(typeSeparator)} }` || "void");
    }
}
exports.messageType = messageType;
exports.default = typescript;
