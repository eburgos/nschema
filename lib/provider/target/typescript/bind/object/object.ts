/**
 * Created by eburgos on 6/13/14.
 */
'use strict';
import {NineSchemaConfig, NSchemaInterface, Target} from "../../../../../model"
import {TypeScript} from "../../typescript"
import {TemplateFunction} from "ejs"
import path = require('path')

function baseGenerate (config: NineSchemaConfig, nschema: NSchemaInterface, target: Target, template: TemplateFunction, typescript: TypeScript) {
	return typescript.generate(nschema, config, template, target);
}

let templates: any = {
};

export class NObject {
	typescript: TypeScript;
	init (nschema: NSchemaInterface) {
		let typescript = this.typescript;
		templates.object = nschema.buildTemplate(path.resolve(__dirname, 'class.ejs'));
		nschema.registerTarget({
			name: 'typescript/object',
			type: 'object',
			language: 'typescript',
			description: 'Generate typescript models for your nineschema definitions',
			generate: function (config:NineSchemaConfig, nschema: NSchemaInterface, target: Target) {
				return baseGenerate(config, nschema, target, templates.object, typescript);
			}
		});
		return Promise.resolve(true);
	}
}
let obj = new NObject();

export default obj;