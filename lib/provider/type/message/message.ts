import {Definition, NSchemaInterface, NSchemaMessage, NSchemaPlugin} from "../../../model";
/**
 @module nschema/provider/type/message
 @author Eduardo Burgos <eburgos@gmail.com>
 */

function getMessage (ns: string, name: string, nschema: NSchemaInterface) {
	var filtered = nschema.context.messages.filter(function (m) {
		return ((m.namespace || '') === (ns || '')) && ((m.name || '') === (name || ''));
	});
	if (filtered.length) {
		return filtered[0];
	}
	return null;
}

export function processMessage(newConfig: NSchemaMessage, nschema: NSchemaInterface) {
	var	unnamedCount = 0;
	if (!newConfig.data) {
		newConfig.data = [];
	}
	if (newConfig.$extends) {
		var eMsg = getMessage(newConfig.$extends.namespace, newConfig.$extends.name, nschema);
		if (eMsg) {
			Array.prototype.splice.apply(newConfig.data, [0,0].concat(eMsg.data));
		}
		else {
			throw new Error('Could not find a message to extend: namespace=\'' + newConfig.$extends.namespace + '\', name=\'' + newConfig.$extends.name + '\'');
		}
	}

	newConfig.data.forEach(function (par) {
		if (!par.name) {
			unnamedCount += 1;
			par.name = 'unnamedParameter' + unnamedCount;
		}
	});
};

function execute (parentConfig: Definition, nschema: NSchemaInterface) {
	nschema.registerObject(parentConfig);
	var newConfig = nschema.objClone(parentConfig);
	processMessage(newConfig, nschema);
	nschema.registerMessage(newConfig);
	return Promise.resolve(false);
}
let message: NSchemaPlugin = {
	type: 'type',
	name: 'message',
	description: 'Service messages',
	init: function (nschema: NSchemaInterface) {
		nschema.register('type', this);
		return Promise.resolve(null);
	},
	execute: execute
};

export default message;