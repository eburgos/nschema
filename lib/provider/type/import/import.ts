/**
 @module nschema/provider/type/import
 @author Eduardo Burgos <eburgos@gmail.com>
 */
import path = require('path')
import {Definition, NSchemaInterface, NSchemaPlugin} from "../../../model";

declare let require: (name: string) => any;

function execute (parentConfig: Definition, nschema: NSchemaInterface) {
	var location = parentConfig.$importLocation,
		newConfig;
	location = path.resolve(parentConfig.$nschemaLocation || '', location);
	newConfig = require(location);
	if (!newConfig) {
		throw new Error('Invalid import location: ' + location);
	}
	return nschema.generate(parentConfig, newConfig);
}
let _import: NSchemaPlugin = {
	type: 'type',
	name: 'import',
	description: 'Reference external files in your NSchema tasks',
	init: function (nschema: NSchemaInterface) {
		nschema.register('type', this);
		return Promise.resolve(null);
	},
	execute: execute
};

export default _import;