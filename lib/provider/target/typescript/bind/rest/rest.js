(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path", "js-yaml", "fs"], factory);
    }
})(function (require, exports) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    const path = require("path");
    const yaml = require("js-yaml");
    const fs = require("fs");
    function baseGenerate(config, nschema, target, template, typescript) {
        return typescript.generate(nschema, config, template, target);
    }
    var templates = {};
    function computeImportMatrix(localNamespace, namespaceMapping, $context) {
        var rootContext = {
            imports: {}
        };
        Object.keys($context.imports).forEach(function (p) {
            if (!rootContext.imports[p]) {
                rootContext.imports[p] = {};
                var ns = $context.imports[p];
                Object.keys(ns).forEach(function (name) {
                    rootContext.imports[p][name] = true;
                });
            }
        });
        return Object.keys(rootContext.imports)
            .filter(function (p) {
            return p !== localNamespace;
        })
            .map(function (p) {
            return `import { ${Object.keys(rootContext.imports[p]).join(', ')} } from '${namespaceMapping[p] || ('./' + p)}';`;
        }).join('\n');
    }
    function serverlessPostGen(result, nschema, target, config, template, typescript) {
        let tgt = target;
        let serverless = tgt.$serverless;
        if (!serverless) {
            throw new Error(`target requires a '$serverless' property`);
        }
        let implementation = serverless.implementation;
        let yamlPath = serverless.yamlPath;
        let routePrefix = config.routePrefix;
        if ((routePrefix || '').indexOf('/') === 0) {
            routePrefix = routePrefix.substr(1);
        }
        let realYamlPath = path.resolve(tgt.location, yamlPath);
        let realLocation = path.resolve(tgt.location);
        let serverlessYml = yaml.safeLoad(fs.readFileSync(realYamlPath, 'utf8'));
        if (!serverlessYml.functions) {
            serverlessYml.functions = {};
        }
        let fns = serverlessYml.functions;
        for (let p in fns) {
            delete fns[p];
        }
        let operations = config.operations;
        Object.keys(operations).forEach((op) => {
            let operation = operations[op];
            fns[op] = {
                handler: `${path.relative(path.dirname(realYamlPath), realLocation)}/${config.namespace}/${config.name}.${op}`,
                events: [
                    {
                        http: {
                            path: `${routePrefix}${operation.route}`,
                            method: operation.method,
                            cors: true
                        }
                    }
                ]
            };
        });
        let filePath = path.resolve(tgt.location, yamlPath);
        console.log(`rest-serverless: writing to: ${filePath}`);
        fs.writeFileSync(filePath, yaml.safeDump(serverlessYml));
        let imports = computeImportMatrix(config.namespace, target.$namespaceMapping || {}, result.config.$context);
        result.generated = imports + '\n' + result.generated;
        var filepath, location = target.location;
        if (location.indexOf('.') === 0) {
            filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.ts')));
        }
        else {
            filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.ts')));
        }
        console.log('typescript: writing again to file: ' + filepath);
        return nschema.writeFile(filepath, result.generated).then(_ => {
            let template = templates['consumer-serverless'];
            let tempConfig = config.$u.clone(config);
            tempConfig.$skipWrite = true;
            return baseGenerate(tempConfig, nschema, target, template, typescript).then((exportsResult) => {
                let imports = computeImportMatrix(config.namespace, target.$namespaceMapping || {}, exportsResult.config.$context);
                exportsResult.generated = imports + '\n' + exportsResult.generated;
                let newFilePath = path.resolve(path.dirname(filepath), path.basename(filepath, path.extname(filepath)) + 'Base' + path.extname(filepath));
                return nschema.writeFile(newFilePath, exportsResult.generated).then(_ => {
                    return result;
                });
            });
        });
    }
    class NRest {
        init(nschema) {
            let typescript = this.typescript;
            templates['consumer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer.ejs'));
            templates['consumer-serverless'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumerBase-serverless.ejs'));
            templates['consumer-serverless-exports'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer-serverless.ejs'));
            templates['producer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceProducer.ejs'));
            [
                {
                    type: 'consumer',
                    template: 'consumer',
                    bind: 'rest',
                    postGen: null
                },
                {
                    type: 'consumer',
                    template: 'consumer-serverless-exports',
                    bind: 'rest-serverless',
                    postGen: serverlessPostGen
                },
                {
                    type: 'producer',
                    template: 'producer',
                    bind: 'rest',
                    postGen: null
                }
            ]
                .forEach(function (serviceType) {
                nschema.registerTarget({
                    type: 'service',
                    language: 'typescript',
                    name: 'typescript/rest',
                    bind: serviceType.bind,
                    description: 'Rest services in typescript',
                    serviceType: serviceType.type,
                    generate: function (config, nschema, target) {
                        let p = baseGenerate(config, nschema, target, templates[serviceType.template], typescript);
                        if (serviceType.postGen) {
                            p = p.then((result) => {
                                return serviceType.postGen(result, nschema, target, config, templates[serviceType.template], typescript);
                            });
                        }
                        return p;
                    }
                });
            });
            return Promise.resolve(null);
        }
    }
    let rest = new NRest();
    exports.default = rest;
});
//# sourceMappingURL=rest.js.map