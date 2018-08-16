import * as fs from "fs";
import * as path from "path";
const modifierMap = (modifier) => {
    switch (modifier) {
        case "list":
            return "[]";
        case "array":
            return "[]";
        default:
            return modifier;
    }
};
export class TypeScript {
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
            console.log(err);
        });
    }
    generate(nschema, $nsconfig, template, target) {
        const nsconfig = $nsconfig.$u.clone($nsconfig);
        const config = nsconfig;
        config.$nschema = nschema;
        config.$typescript = this;
        config.$target = target;
        if (typeof config.$skipWrite === "undefined") {
            config.$skipWrite = false;
        }
        if (config.$context) {
            throw new Error("must not have a $context variable");
        }
        config.$context = {
            imports: {}
        };
        const result = template(config);
        if (config.$skipWrite) {
            return Promise.resolve({
                config,
                generated: result
            });
        }
        else {
            const location = target.location;
            const filepath = location.indexOf(".") === 0
                ? path.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.ts`)
                : path.resolve(location, config.namespace || "", config.$fileName || `${config.name}.ts`);
            console.log(`typescript: writing to file: ${filepath}`);
            return nschema.writeFile(filepath, result).then(_ => {
                return {
                    config,
                    generated: result
                };
            }, err => {
                console.log("error: ");
                console.log(err);
            });
        }
    }
    typeName($nschemaType, $nschema, namespace, name, context) {
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
        if ($nschemaType && $nschemaType.modifier) {
            const $modifier = $nschemaType.modifier;
            const modifierArr = !$nschema.isArray($modifier)
                ? [$modifier]
                : $modifier;
            modifierArr.forEach(item => {
                result += ` ${modifierMap(item)}`;
            });
        }
        return result;
    }
}
const typescript = new TypeScript();
export default typescript;
//# sourceMappingURL=typescript.js.map