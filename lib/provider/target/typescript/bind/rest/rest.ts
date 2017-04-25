/**
 * Created by eburgos on 6/13/14.
 */
'use strict';
import {Definition, NSchemaInterface, Target, TargetBind} from "../../../../../model";
import {TemplateFunction} from "ejs";
import {TypeScript} from "../../typescript";
import path = require('path');

function baseGenerate (config: Definition, nschema: NSchemaInterface, target: Target, template: TemplateFunction, typescript: TypeScript) {
	return typescript.generate(nschema, config, template, target);
}

var templates: { [name: string]: TemplateFunction } = {
};

class NRest {
	typescript: TypeScript;
	type: 'service';
	language: 'typescript';
	name: 'rest';
	init (nschema: NSchemaInterface) {
		let typescript = this.typescript;
		
		templates['consumer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer.ejs'));
		templates['producer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceProducer.ejs'));
		['consumer', 'producer']
			.forEach(function (serviceType) {
				nschema.registerTarget({
					type: 'service',
					language: 'typescript',
					name: 'typescript/rest',
					bind: 'rest',
					description: 'Rest services in typescript',
					serviceType: serviceType,
					generate: function (config: Definition, nschema: NSchemaInterface, target: Target) {
						return baseGenerate(config, nschema, target, templates[serviceType], typescript);
					}
				});
			});
		return Promise.resolve(null);
	}
}


let rest = new NRest();

export default rest;