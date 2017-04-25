/**
 * Created by eburgos on 6/13/14.
 */
'use strict';
import {Definition, NSchemaInterface, Target } from "../../../../../model"
import {TemplateFunction} from "ejs"
import {TypeScript} from "../../typescript"
import path = require('path')

function baseGenerate (config: Definition, nschema: NSchemaInterface, target: Target, template: TemplateFunction, typescript: TypeScript) {
	return typescript.generate(nschema, config, template, target);
}

let templates: { [name:string]: TemplateFunction } = {
};

class AmqpRpc {
	typescript: TypeScript;
	init (nschema: NSchemaInterface) {
		let typescript = this.typescript;
		templates['consumer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer.ejs'));
		templates['producer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceProducer.ejs'));
		['consumer', 'producer']
			.forEach(function (serviceType) {
				nschema.registerTarget({
					name: 'typescript/amqpRpc',
					type: 'service',
					language: 'typescript',
					description: 'Generates a service layer where messages get sent over an AMQP protocol',
					bind: 'amqpRpc',
					serviceType: serviceType,
					generate: function (config: Definition, nschema: NSchemaInterface, target: Target) {
						return baseGenerate(config, nschema, target, templates[serviceType], typescript);
					}
				});
			});
		return Promise.resolve(null);
	}
};

let amqprpc = new AmqpRpc();

export default amqprpc;