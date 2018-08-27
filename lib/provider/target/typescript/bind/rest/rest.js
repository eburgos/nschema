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
const yaml = require("js-yaml");
const path = require("path");
function checkAndFixTarget(target, namespaceMapping) {
    const r = Object.assign({ $typeScriptRest: { requestModule: "axios" } }, target);
    if (!r.$typeScriptRest) {
        throw new Error("Invalid target for TypeScript Rest");
    }
    if (!r.$typeScriptRest.requestModule) {
        throw new Error("Invalid target requestModule for TypeScript Rest");
    }
    if (namespaceMapping) {
        if (!namespaceMapping[r.$typeScriptRest.requestModule]) {
            namespaceMapping[r.$typeScriptRest.requestModule] =
                r.$typeScriptRest.requestModule;
        }
    }
    return r;
}
exports.checkAndFixTarget = checkAndFixTarget;
function baseGenerate(config, nschema, target, template, typescript) {
    return typescript.generate(nschema, config, template, target);
}
const templates = {};
function computeImportMatrix(localNamespace, namespaceMapping, $context) {
    const rootContext = {
        imports: {}
    };
    Object.keys($context.imports).forEach(p => {
        if (!rootContext.imports[p]) {
            rootContext.imports[p] = {};
            const ns = $context.imports[p];
            Object.keys(ns).forEach(name => {
                rootContext.imports[p][name] = true;
            });
        }
    });
    return Object.keys(rootContext.imports)
        .filter(p => {
        return p !== localNamespace;
    })
        .map(p => {
        return `import { ${Object.keys(rootContext.imports[p]).join(", ")} } from '${namespaceMapping[p] || `./${p}`}';`;
    })
        .join("\n");
}
function serverlessPostGen(result, nschema, target, config, template, typescript) {
    return __awaiter(this, void 0, void 0, function* () {
        const tgt = target;
        const serverless = tgt.$serverless;
        if (!serverless) {
            throw new Error(`target requires a '$serverless' property`);
        }
        const implementation = serverless.implementation;
        const yamlPath = serverless.yamlPath;
        let routePrefix = config.routePrefix || "";
        if (routePrefix.indexOf("/") === 0) {
            routePrefix = routePrefix.substr(1);
        }
        const realYamlPath = path.resolve(tgt.location, yamlPath);
        const realLocation = path.resolve(tgt.location);
        const serverlessYml = yaml.safeLoad(fs.readFileSync(realYamlPath, "utf8"));
        if (!serverlessYml.functions) {
            serverlessYml.functions = {};
        }
        const fns = serverlessYml.functions;
        for (const p in fns) {
            if (fns.hasOwnProperty(p)) {
                delete fns[p];
            }
        }
        const operations = config.operations;
        Object.keys(operations).forEach((op) => {
            const operation = operations[op];
            fns[op] = {
                events: [
                    {
                        http: {
                            cors: true,
                            method: operation.method,
                            path: `${routePrefix}${operation.route}`
                        }
                    }
                ],
                handler: `${path.relative(path.dirname(realYamlPath), realLocation)}/${config.namespace}/${config.name}.${op}`
            };
        });
        const filePath = path.resolve(tgt.location, yamlPath);
        console.log(`rest-serverless: writing to: ${filePath}`);
        fs.writeFileSync(filePath, yaml.safeDump(serverlessYml));
        const imports = computeImportMatrix(config.namespace || "", target.$namespaceMapping || {}, result.config.$context);
        result.generated = `${imports}${"\n"}${result.generated}`;
        const location = target.location;
        const filepath = location.indexOf(".") === 0
            ? path.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.ts`)
            : path.resolve(location, config.namespace || "", config.$fileName || `${config.name}.ts`);
        console.log(`typescript: writing again to file: ${filepath}`);
        yield nschema.writeFile(filepath, result.generated);
        const thisTemplate = templates["consumer-serverless"];
        const tempConfig = config.$u.clone(config);
        tempConfig.$skipWrite = true;
        const exportsResult = yield baseGenerate(tempConfig, nschema, checkAndFixTarget(target, target.$namespaceMapping || {}), thisTemplate, typescript);
        const thisImports = computeImportMatrix(config.namespace || "", target.$namespaceMapping || {}, exportsResult.config.$context);
        exportsResult.generated = `${thisImports}${"\n"}${exportsResult.generated}`;
        const newFilePath = path.resolve(path.dirname(filepath), `${path.basename(`${filepath}`, path.extname(filepath))}Base${path.extname(filepath)}`);
        console.log(`typescript: writing again to file: ${newFilePath}`);
        yield nschema.writeFile(newFilePath, exportsResult.generated);
        return result;
    });
}
class NRest {
    constructor() {
        this.language = "typescript";
        this.name = "rest";
        this.type = "service";
        this.typescript = undefined;
    }
    init(nschema) {
        if (!this.typescript) {
            throw new Error("Argument exception");
        }
        const typescript = this.typescript;
        templates.consumer = nschema.buildTemplate(path.resolve(__dirname, "serviceConsumer.ejs"));
        templates["consumer-serverless"] = nschema.buildTemplate(path.resolve(__dirname, "serviceConsumerBase-serverless.ejs"));
        templates["consumer-serverless-exports"] = nschema.buildTemplate(path.resolve(__dirname, "serviceConsumer-serverless.ejs"));
        templates.producer = nschema.buildTemplate(path.resolve(__dirname, "serviceProducer.ejs"));
        return Promise.all([
            {
                bind: "rest",
                postGen: undefined,
                template: "consumer",
                type: "consumer"
            },
            {
                bind: "rest-serverless",
                postGen: serverlessPostGen,
                template: "consumer-serverless-exports",
                type: "consumer"
            },
            {
                bind: "rest",
                postGen: undefined,
                template: "producer",
                type: "producer"
            }
        ].map(serviceType => {
            return nschema.registerTarget({
                bind: serviceType.bind,
                description: "Rest services in typescript",
                language: "typescript",
                name: "typescript/rest",
                serviceType: serviceType.type,
                type: "service",
                generate(config, thisNschema, target) {
                    const newTarget = checkAndFixTarget(target, target.$namespaceMapping || {});
                    let p = baseGenerate(config, thisNschema, newTarget, templates[serviceType.template], typescript);
                    if (serviceType.postGen) {
                        p = p.then((result) => {
                            if (serviceType.postGen) {
                                return serviceType.postGen(result, thisNschema, newTarget, config, templates[serviceType.template], typescript);
                            }
                            else {
                                throw new Error("Not possible");
                            }
                        });
                    }
                    return p;
                }
            });
        }));
    }
}
exports.NRest = NRest;
const rest = new NRest();
exports.default = rest;
//# sourceMappingURL=rest.js.map