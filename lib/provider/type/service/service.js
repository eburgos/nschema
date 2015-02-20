/**
 @module nschema/provider/type/service
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function() {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		isNode = (typeof(window) === 'undefined');

	/**
	 */
	function moduleExport () {
		function execute (parentConfig, nschema) {
			var operations;
			if (parentConfig.operations) {
				operations = parentConfig.operations;
				for (var p in operations) {
					if (operations.hasOwnProperty(p)) {
						nschema.types.message.processMessage(operations[p].inMessage, nschema);
						nschema.types.message.processMessage(operations[p].outMessage, nschema);
					}
				}
			}
			nschema.registerService(parentConfig);
			var newConfig = nschema.objClone(parentConfig);
			var target = newConfig.$target;
			if (!nschema.isArray(target)) {
				target = [target];
			}

			target.forEach(function (item) {
				item.type = 'service';
				var targetImplementation = nschema.getTarget(item);
				targetImplementation.generate(newConfig, nschema, item);
			});

		}
		return {
			name: 'service',
			init: function (nschema, done) {
				nschema.register('type', this);
				done();
			},
			execute: execute
		};
	}
	if (isAmd) { //AMD
		//Trying for RequireJS and hopefully every other
		define([], moduleExport);
	} else if (isNode) { //Server side
		module.exports = moduleExport();
	} else {
		// plain script in a browser
		// Non AMD/CJS environments are not supported. Figure it out on your own. Sorry.
		throw new Error('Environment not supported');
	}
})();