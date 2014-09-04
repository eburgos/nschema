/**
 @module nschema/provider/type/import
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function() {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		//isDojo = isAmd && define.amd.vendor === 'dojotoolkit.org',
		isNode = (typeof(window) === 'undefined'),
		excludedConfigNames = ['$type', '$namespace', 'list'];//,
//		req = (isDojo && isNode)? global.require : require;

	/**
	 */
	function moduleExport () {
		function execute (parentConfig, nschema) {
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
			for (cnt = 0; cnt < len; cnt += 1) {
				cur = arr[cnt];
				nschema.generate(newConfig, cur);
			}
		}
		return {
			name: 'bundle',
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