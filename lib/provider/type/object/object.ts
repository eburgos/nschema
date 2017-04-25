import {Definition, NSchemaInterface, NSchemaPlugin, Target} from "../../../model";
import {defer, all} from "ninejs/core/deferredUtils";
/**
 @module nschema/provider/type/object
 @author Eduardo Burgos <eburgos@gmail.com>
 */

function execute (parentConfig: Definition, nschema: NSchemaInterface) {
	nschema.registerObject(parentConfig);
	var _defer = defer();
	process.nextTick(function () {
		var newConfig = nschema.objClone(parentConfig);
		newConfig.$subType = newConfig.$subType || '';

		var target: Target | Target[] = newConfig.$target;
		let targetArr: Target[];
		if (target) {
			if (!nschema.isArray(target)) {
				targetArr = [target];
			}
			else {
				targetArr = target;
			}
			var result = targetArr.map(function (item) {
				item.type = 'object';
				return nschema.getTarget(item).generate(newConfig, nschema, item);
			});
			all(result).then(arr => {
				_defer.resolve(arr);
			});
		}
		else {
			_defer.resolve(false);
		}
	});
	return _defer.promise;
}

let obj: NSchemaPlugin = {
	type: 'type',
	name: 'object',
	description: 'Generates classes and objects',
	init: function (nschema: NSchemaInterface) {
		return nschema.register('type', this);
	},
	execute: execute
};

export default obj;