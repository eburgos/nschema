/**
 * Created by eburgos on 6/13/14.
 */
'use strict';
import {Definition, NSchemaInterface, Target, TargetBind} from "../../../../../model";
import {TemplateFunction} from "ejs";
import {FSharp} from "../../fsharp";
import path = require('path');

function baseGenerate (config: Definition, nschema: NSchemaInterface, target: Target, template: TemplateFunction, fsharp: FSharp) {
	return fsharp.generate(nschema, config, template, target);
}

var templates: { [name: string]: TemplateFunction } = {
};

class NRest {
	fsharp: FSharp;
	init (nschema: NSchemaInterface) {
		let fsharp = this.fsharp;
		
		templates['consumer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceConsumer.ejs'));
		templates['producer'] = nschema.buildTemplate(path.resolve(__dirname, 'serviceProducer.ejs'));
		['consumer', 'producer']
			.forEach(function (serviceType) {
				nschema.registerTarget({
					type: 'service',
					language: 'fsharp',
					name: 'fsharp/rest',
					bind: 'rest',
					description: 'Rest services in fsharp',
					serviceType: serviceType,
					generate: function (config: Definition, nschema: NSchemaInterface, target: Target) {
						return baseGenerate(config, nschema, target, templates[serviceType], fsharp);
					}
				});
			});
		return Promise.resolve(null);
	}
}


let rest = new NRest();

export default rest;