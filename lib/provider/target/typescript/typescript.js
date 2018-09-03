"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const logging_1 = require("../../../logging");
const modifierMap = (modifier) => {
    switch (modifier) {
        case "list":
            return "[]";
        case "array":
            return "[]";
        case "option":
            return "| undefined";
        default:
            return modifier;
    }
};
var RestClientStrategy;
(function (RestClientStrategy) {
    RestClientStrategy["Default"] = "Default";
    RestClientStrategy["Angular2"] = "Angular2";
})(RestClientStrategy = exports.RestClientStrategy || (exports.RestClientStrategy = {}));
class TypeScript {
    init(nschema) {
        const providerPath = path.resolve(__dirname, "bind");
        const self = this;
        return Promise.all(fs
            .readdirSync(providerPath)
            .filter(item => {
            return fs.statSync(path.resolve(providerPath, item)).isDirectory();
        })
            .map(d => {
            return fs.readdirSync(path.resolve(providerPath, d)).map(i => {
                return path.resolve(providerPath, d, i);
            });
        })
            .reduce((a, b) => {
            return a.concat(b);
        })
            .filter(item => {
            return path.extname(item) === ".js" && fs.existsSync(item);
        })
            .map(require)
            .map(m => {
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
        })).then(() => {
            return arguments[0];
        }, err => {
            throw new Error(err);
        });
    }
    generate(nschema, $nsconfig, template, target, providedContext) {
        const nsconfig = $nsconfig.$u.clone($nsconfig);
        const config = nsconfig;
        config.$nschema = nschema;
        config.$target = target;
        const context = Object.assign({}, buildTypeScriptContext(), providedContext, { imports: {} });
        const result = template(Object.assign({}, config, { $context: context }));
        if (context.skipWrite) {
            return Promise.resolve({
                config,
                context,
                generated: result
            });
        }
        else {
            const location = target.location;
            const filepath = location.indexOf(".") === 0
                ? path.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.ts`)
                : path.resolve(location, config.namespace || "", config.$fileName || `${config.name}.ts`);
            logging_1.writeLog(logging_1.LogLevel.Default, `typescript: writing to file: ${filepath}`);
            return nschema.writeFile(filepath, result).then(_ => {
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
    typeName($nschemaType, $nschema, namespace, _name, context, addFlowComment) {
        let result;
        const typeMap = (t) => {
            switch (t) {
                case "int":
                    return "number";
                case "float":
                    return "number";
                case "string":
                    return "string";
                case "bool":
                    return "boolean";
                case "Date":
                    return "Date";
            }
            return "string";
        };
        if (typeof $nschemaType === "string") {
            result = typeMap($nschemaType);
        }
        else if (typeof $nschemaType === "object") {
            let ns = $nschemaType.namespace;
            if (typeof ns === "undefined") {
                ns = namespace || "";
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
            result = typeMap("string");
        }
        if ($nschemaType &&
            typeof $nschemaType === "object" &&
            $nschemaType.modifier) {
            const $modifier = $nschemaType.modifier;
            const modifierArr = !$nschema.isArray($modifier)
                ? [$modifier]
                : $modifier;
            modifierArr.forEach(item => {
                result = `(${result} ${modifierMap(item)})`;
            });
        }
        if (addFlowComment) {
            return `${result} /* :${result} */`;
        }
        else {
            return result;
        }
    }
}
exports.TypeScript = TypeScript;
const typescript = new TypeScript();
function getDataItems(nschema, nsMessage) {
    const r = [];
    if (nsMessage.$extends) {
        const parent = nschema.getMessage(nsMessage.$extends.namespace || "", nsMessage.$extends.name);
        if (parent) {
            getDataItems(nschema, parent).forEach(i => {
                r.push(i);
            });
        }
        else {
            throw new Error(`could not find parent: ns="${nsMessage.$extends.namespace ||
                ""}" name="${nsMessage.$extends.name}"`);
        }
    }
    (nsMessage.data || []).map(item => {
        r.push(item);
    });
    return r;
}
function messageType(nschema, $context, addFlowComment, message) {
    const typeSeparator = ", ";
    const dataItems = getDataItems(nschema, message);
    if (dataItems.length === 0) {
        return "void";
    }
    else if (dataItems.length === 1) {
        const item = dataItems[0];
        return `${typescript.typeName(item.type, nschema, "", "", $context, addFlowComment)}`;
    }
    else {
        return (`{ ${dataItems
            .map((item, $i) => {
            return `${item.name || `item${$i}`}: ${typescript.typeName(item.type, nschema, "", "", $context, addFlowComment)}`;
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
//# sourceMappingURL=typescript.js.map