
/**
 @module nschema/provider/type/service
 @author Eduardo Burgos <eburgos@gmail.com>
 */

import {processMessage} from "../message/message"
import {Definition, NSchemaInterface, NSchemaPlugin, NSchemaService, Target} from "../../../model";
import {all} from "ninejs/core/deferredUtils";


function execute (origParentConfig: Definition, nschema: NSchemaInterface) {
	let parentConfig: NSchemaService = origParentConfig as NSchemaService;
	var operations;
	if (parentConfig.operations) {
		operations = parentConfig.operations;
		for (var p in operations) {
			if (operations.hasOwnProperty(p)) {
				processMessage(operations[p].inMessage, nschema);
				processMessage(operations[p].outMessage, nschema);
			}
		}
	}
	nschema.registerService(parentConfig);
	var newConfig = nschema.objClone(parentConfig);
	var target: Target | Target[] = newConfig.$target;
	let targetArr: Target[];
	if (!nschema.isArray(target)) {
		targetArr = [target];
	}
	else {
		targetArr = target;
	}

	var r = targetArr.map(function (item) {
		item.type = 'service';
		var targetImplementation = nschema.getTarget(item);
		return targetImplementation.generate(newConfig, nschema, item);
	});
	
	return all(r);
}

let service: NSchemaPlugin = {
	type: 'type',
	name: 'service',
	description: 'Handles service generation',
	init: function (nschema:NSchemaInterface) {
		nschema.register('type', this);
		return Promise.resolve(null);
	},
	execute: execute
};

export default service;