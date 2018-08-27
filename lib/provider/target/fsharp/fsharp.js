"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
class FSharp {
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
            m.fsharp = self;
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
    generate(nschema, nsconfig, template, target) {
        const config = nsconfig;
        config.$nschema = nschema;
        config.$fsharp = this;
        config.$target = target;
        const result = template(config);
        const location = target.location;
        const filepath = location.indexOf(".") === 0
            ? path.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.fs`)
            : path.resolve(location, config.namespace || "", config.$fileName || `${config.name}.fs`);
        console.log(`fsharp: writing to file: ${filepath}`);
        return nschema.writeFile(filepath, result).then(null, err => {
            console.log("error: ");
            console.log(err);
        });
    }
    typeName($nschemaType, $nschema, namespace) {
        let result;
        const typeMap = (t) => {
            switch (t) {
                case "int":
                    return "int";
                case "float":
                    return "float";
                case "string":
                    return "string";
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
            result = `${ns}.${$nschemaType.name}`;
        }
        else {
            result = typeMap("string");
        }
        if ($nschemaType.modifier) {
            const $modifier = $nschemaType.modifier;
            const modifierArr = !$nschema.isArray($modifier)
                ? [$modifier]
                : $modifier;
            modifierArr.forEach(item => {
                result += ` ${item}`;
            });
        }
        return result;
    }
}
exports.FSharp = FSharp;
const fsharp = new FSharp();
exports.default = fsharp;
//# sourceMappingURL=fsharp.js.map