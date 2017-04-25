/**
 * Created by eburgos on 6/13/14.
 */
'use strict';
import {Definition, NSchemaInterface, Target } from "../../../../../model"
import {TemplateFunction} from "ejs"
import {FSharp} from "../../fsharp"
import path = require('path')

function baseGenerate (config: Definition, nschema: NSchemaInterface, target: Target, template: TemplateFunction, fsharp: FSharp) {
	return fsharp.generate(nschema, config, template, target);
}

let templates: { [name:string]: TemplateFunction } = {
};

class AmqpRpc {
	fsharp: FSharp;
	init (nschema: NSchemaInterface) {
		let fsharp = this.fsharp;
		templates['consumer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer.ejs'));
		templates['producer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceProducer.ejs'));
		['consumer', 'producer']
			.forEach(function (serviceType) {
				nschema.registerTarget({
					name: 'fsharp/amqpRpc',
					type: 'service',
					language: 'fsharp',
					description: 'Generates a service layer where messages get sent over an AMQP protocol',
					bind: 'amqpRpc',
					serviceType: serviceType,
					generate: function (config: Definition, nschema: NSchemaInterface, target: Target) {
						return baseGenerate(config, nschema, target, templates[serviceType], fsharp);
					}
				});
			});
		return Promise.resolve(null);
	}
};

let amqprpc = new AmqpRpc();

export default amqprpc;