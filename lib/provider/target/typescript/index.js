"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
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
    generate(nschema, $nsconfig, template, target, providedContext) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                    .then(_ => {
                    return {
                        config,
                        context,
                        generated: result
                    };
                }, err => {
                    throw new Error(err);
                });
            }
        });
    }
    init(nschema) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const providerPath = path_1.resolve(__dirname, "bind");
            const self = this;
            return Promise.all(fs_1.readdirSync(providerPath)
                .filter(item => {
                return fs_1.statSync(path_1.resolve(providerPath, item)).isDirectory();
            })
                .map(d => {
                return fs_1.readdirSync(path_1.resolve(providerPath, d)).map(i => {
                    return path_1.resolve(providerPath, d, i);
                });
            })
                .reduce((a, b) => {
                return a.concat(b);
            })
                .filter(item => {
                return path_1.extname(item) === ".js" && fs_1.existsSync(item);
            })
                .map(require)
                .map((m) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                if (m.default) {
                    m = m.default;
                }
                m.typescript = self;
                return new Promise((resolve, reject) => {
                    if (typeof m.init === "function") {
                        m.init(nschema).then(() => {
                            resolve(true);
                        }, (err) => {
                            reject(err);
                        });
                    }
                    else {
                        resolve(true);
                    }
                });
            }))).then(undefined, err => {
                throw new Error(err);
            });
        });
    }
}
exports.TypeScript = TypeScript;
const typescript = new TypeScript();
function getDataItems(nschema, nsMessage) {
    const r = [];
    if (nsMessage.extends) {
        const parent = nschema.getMessage(nsMessage.extends.namespace || "", nsMessage.extends.name);
        if (parent) {
            getDataItems(nschema, parent).forEach(i => {
                r.push(i);
            });
        }
        else {
            throw new Error(`could not find parent: ns="${nsMessage.extends.namespace ||
                ""}" name="${nsMessage.extends.name}"`);
        }
    }
    (nsMessage.data || []).map(item => {
        r.push(item);
    });
    return r;
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
            .map((item, $i) => {
            return `${item.name || `item${$i}`}: ${helpers_1.typeName(item.type, nschema, "", "", context, addFlowComment, false, true)}`;
        })
            .join(typeSeparator)} }` || "void");
    }
}
exports.messageType = messageType;
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
exports.default = typescript;
