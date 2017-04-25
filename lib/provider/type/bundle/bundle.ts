/**
 @module nschema/provider/type/import
 @author Eduardo Burgos <eburgos@gmail.com>
 */
import { all } from 'ninejs/core/deferredUtils'
import {Definition, NSchemaInterface, NSchemaPlugin, Target} from "../../../model";

let excludedConfigNames = ['$type', '$namespace', 'list'];



function execute (parentConfig: Definition, nschema: NSchemaInterface) {
	var cnt,
		arr = parentConfig.list || [],
		len = arr.length,
		cur,
		newConfig = nschema.objClone(parentConfig);
	//getting new config
	nschema.mixinRecursive(newConfig, parentConfig, function (_1, _2, p) {
		/* jshint unused: true */
		return excludedConfigNames.indexOf(p) < 0;
	});
	if (parentConfig.$namespace) {
		newConfig.namespace += '.' + parentConfig.$namespace;
	}
	let tempTargets = newConfig.$target;
	let resultPromise: Promise<any> = Promise.resolve(true);
	let toRemove: number[] = [];
	(tempTargets || []).forEach(function (tgt: Target, i: number) {
		let customBundle = nschema.getCustomPlugin('customBundle', tgt);
		if (customBundle) {
			resultPromise = resultPromise.then(() => {
				newConfig.$target = [tgt];
				return customBundle.execute(newConfig, nschema).then(() => {
					newConfig.$target = tempTargets;
				});
			});
			toRemove.push(i);
		}
	});

	toRemove.reverse().forEach(i => {
		newConfig.$target.splice(i, 1);
	});

	return arr.reduce((acc, next) => {
		return acc.then(() => {
			return nschema.generate(newConfig, next);
		});
	}, resultPromise);
}

let bundle: NSchemaPlugin = {
	type: 'type',
	name: 'bundle',
	description: 'Handles the concept of namespacing in the generation process',
	init: function (nschema: NSchemaInterface) {
		return nschema.register('type', this);
	},
	execute: execute
};


export default bundle;