/**
 @module nschema/provider/type/object
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function() {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		isDojo = isAmd && define.amd.vendor === 'dojotoolkit.org',
		isNode = (typeof(window) === 'undefined'),
		//excludedConfigNames = ['$type'],
		req = (isDojo && isNode)? global.require : require;

	/**
	 */
	function moduleExport () {
		function execute (parentConfig, nschema) {
			nschema.registerObject(parentConfig);
			var newConfig = nschema.objClone(parentConfig);
			newConfig.$subType = newConfig.$subType || '';
			var target = newConfig.$target;
			if (!nschema.isArray(target)) {
				target = [target];
			}
			target.forEach(function (item) {
				item.type = 'object';
				nschema.getTarget(item).generate(newConfig, nschema, item);
			});

		}
		return {
			name: 'object',
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