/**
 * Created by eburgos on 6/13/14.
 */



'use strict';
import {
    Definition, NSchemaInterface, NSchemaRestOperation, NSchemaRestService, NSchemaService, Target,
    TargetBind
} from "../../../../../model";
import {TemplateFunction} from "ejs";
import {TypeScript, TypeScriptConfig} from "../../typescript";
import path = require('path');
import yaml = require('js-yaml');
import fs = require('fs');

function baseGenerate (config: Definition, nschema: NSchemaInterface, target: Target, template: TemplateFunction, typescript: TypeScript) {
	return typescript.generate(nschema, config, template, target);
}

var templates: { [name: string]: TemplateFunction } = {
};

function computeImportMatrix(localNamespace: string, namespaceMapping: {[name: string]: string}, $context: any) {
    var rootContext: any = {
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

function serverlessPostGen(result: { generated: any, config: TypeScriptConfig } | any, nschema: NSchemaInterface, target: Target, config: NSchemaRestService, template: TemplateFunction, typescript: TypeScript): Promise<{ generated: any, config: TypeScriptConfig }> {

	let tgt: any = target;
	let serverless = tgt.$serverless;
	if (!serverless) {
		throw new Error(`target requires a '$serverless' property`);
	}
	let implementation: string = serverless.implementation;
	let yamlPath: string = serverless.yamlPath;
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
	Object.keys(operations).forEach((op: string) => {
		let operation: NSchemaRestOperation = operations[op] as NSchemaRestOperation;
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

    var filepath: string,
        location = target.location;
    if (location.indexOf('.') === 0) {
        filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.ts')));
    }
    else {
        filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.ts')));
    }
    console.log('typescript: writing again to file: ' + filepath);
    return nschema.writeFile(filepath, result.generated).then(_ => {
		let template = templates['consumer-serverless'];
        let tempConfig: any = config.$u.clone(config);
        tempConfig.$skipWrite = true;
        return baseGenerate(tempConfig, nschema, target, template, typescript).then ((exportsResult: any) => {
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
	typescript: TypeScript;
	type: 'service';
	language: 'typescript';
	name: 'rest';
	init (nschema: NSchemaInterface) {
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
					generate: function (config: Definition, nschema: NSchemaInterface, target: Target) {
						let p = baseGenerate(config, nschema, target, templates[serviceType.template], typescript);
						if (serviceType.postGen) {
							p = p.then((result: any) => {
								return serviceType.postGen(result, nschema, target, config as NSchemaService, templates[serviceType.template], typescript);
							})
						}
						return p;
					}
				});
			});
		return Promise.resolve(null);
	}
}


let rest = new NRest();

export default rest;