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
const logging_1 = require("../../../../../logging");
const helpers_1 = require("../../helpers");
const __1 = require("../..");
const serviceConsumer_1 = require("./serviceConsumer");
const serviceConsumer_serverless_1 = require("./serviceConsumer-serverless");
const serviceConsumerBase_serverless_1 = require("./serviceConsumerBase-serverless");
const serviceProducer_1 = require("./serviceProducer");
const utils_1 = require("../../../../../utils");
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
function baseGenerate(config, nschema, target, template, typescript, context) {
    return typescript.generate(nschema, config, template, target, context);
}
const templates = {};
function serverlessPostGen(result, nschema, target, config, template, typescript, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const tgt = target;
        const serverless = tgt.$serverless;
        if (!serverless) {
            throw new Error(`target requires a '$serverless' property`);
        }
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
        logging_1.writeLog(logging_1.LogLevel.Default, `rest-serverless: updating serverless yml specification at: ${filePath}`);
        fs.writeFileSync(filePath, yaml.safeDump(serverlessYml));
        const imports = helpers_1.computeImportMatrix(config.namespace || "", target.$namespaceMapping || {}, result.context);
        result.generated = `${imports}${"\n"}${result.generated}`;
        const location = target.location;
        const filepath = location.indexOf(".") === 0
            ? path.resolve(process.cwd(), location, config.namespace || "", target.$fileName || `${config.name}.ts`)
            : path.resolve(location, config.namespace || "", config.$fileName || `${config.name}.ts`);
        logging_1.writeLog(logging_1.LogLevel.Default, `rest-serverless: updating import info to file: ${filepath}`);
        yield nschema.writeFile(filepath, result.generated);
        const thisTemplate = templates["consumer-serverless"];
        const tempConfig = utils_1.clone(config);
        context.skipWrite = true;
        const exportsResult = yield baseGenerate(tempConfig, nschema, checkAndFixTarget(target, target.$namespaceMapping || {}), thisTemplate, typescript, context);
        const thisImports = helpers_1.computeImportMatrix(config.namespace || "", target.$namespaceMapping || {}, exportsResult.context);
        exportsResult.generated = `${thisImports}${"\n"}${exportsResult.generated}`;
        const newFilePath = path.resolve(path.dirname(filepath), `${path.basename(`${filepath}`, path.extname(filepath))}Base${path.extname(filepath)}`);
        logging_1.writeLog(logging_1.LogLevel.Default, `rest-serverless: writing base service interface to file: ${newFilePath}`);
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
        templates.consumer = (data) => {
            return serviceConsumer_1.render(nschema, data.$context, data, data.$target);
        };
        templates["consumer-serverless"] = (data) => {
            return serviceConsumerBase_serverless_1.render(nschema, data.$context, data, data.$target);
        };
        templates["consumer-serverless-exports"] = (data) => {
            return serviceConsumer_serverless_1.render(nschema, data.$context, data, data.$target);
        };
        templates.producer = (data) => {
            return serviceProducer_1.render(nschema, data.$context, data, data.$target);
        };
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
            logging_1.writeLog(logging_1.LogLevel.Debug, `Registering target: type =>"service", bind => ${serviceType.bind}, language => ${"typescript"}`);
            return nschema.registerTarget({
                bind: serviceType.bind,
                description: "Rest services in typescript",
                language: "typescript",
                name: "typescript/rest",
                serviceType: serviceType.type,
                type: "service",
                generate(config, thisNschema, target, providedContext) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const context = (() => {
                            const tempContext = providedContext || __1.buildTypeScriptContext();
                            if (!tempContext.hasTypeScript) {
                                return Object.assign({}, __1.buildTypeScriptContext(), tempContext);
                            }
                            else {
                                return tempContext;
                            }
                        })();
                        const newTarget = checkAndFixTarget(target, target.$namespaceMapping || {});
                        logging_1.writeLog(logging_1.LogLevel.Debug, `Writing ${serviceType.bind} ${serviceType.type} template contents for "${config.namespace || ""}::${config.name}" to "${newTarget.location}"`);
                        const result = yield baseGenerate(config, thisNschema, newTarget, templates[serviceType.template], typescript, context);
                        if (serviceType.postGen) {
                            yield serviceType.postGen(result, thisNschema, newTarget, config, templates[serviceType.template], typescript, context);
                        }
                        return result;
                    });
                }
            });
        }));
    }
}
exports.NRest = NRest;
const rest = new NRest();
exports.default = rest;
