/**
 * Created by eburgos on 6/13/14.
 */
'use strict';
import {NineSchemaConfig, NSchemaInterface, Target} from "../../../../../model"
import {FSharp} from "../../fsharp"
import {TemplateFunction} from "ejs"
import path = require('path')

function baseGenerate (config: NineSchemaConfig, nschema: NSchemaInterface, target: Target, template: TemplateFunction, fsharp: FSharp) {
	return fsharp.generate(nschema, config, template, target);
}

let templates: { [name: string]: TemplateFunction } = {
};

export class NObject {
	fsharp: FSharp;
	init (nschema: NSchemaInterface) {
		let fsharp = this.fsharp;
		templates['object'] = nschema.buildTemplate(path.resolve(__dirname, 'class.ejs'));
		nschema.registerTarget({
			name: 'fsharp/object',
			type: 'object',
			language: 'fsharp',
			description: 'Generate fsharp models for your nineschema definitions',
			generate: function (config:NineSchemaConfig, nschema: NSchemaInterface, target: Target) {
				return baseGenerate(config, nschema, target, templates['object'], fsharp);
			}
		});
		return Promise.resolve(true);
	}
}
let obj = new NObject();

export default obj;