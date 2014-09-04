/**
 @module nschema/provider/type/import
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function() {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		isDojo = isAmd && define.amd.vendor === 'dojotoolkit.org',
		isNode = (typeof(window) === 'undefined'),
		req = (isDojo && isNode)? global.require : require;

	/**
	 */
	function moduleExport (require) {
		var path = require('path');
		function execute (parentConfig, nschema) {
			var location = parentConfig.$importLocation,
				newConfig;
			location = path.resolve(parentConfig.$nschemaLocation || '', location);
			newConfig = require(location);
			if (!newConfig) {
				throw new Error('Invalid import location: ' + location);
			}
			nschema.generate(parentConfig, newConfig);
		}
		return {
			name: 'import',
			init: function (nschema, done) {
				nschema.register('type', this);
				done();
			},
			execute: execute
		};
	}
	if (isAmd) { //AMD
		//Trying for RequireJS and hopefully every other
		define(['require'], moduleExport);
	} else if (isNode) { //Server side
		module.exports = moduleExport(req);
	} else {
		// plain script in a browser
		// Non AMD/CJS environments are not supported. Figure it out on your own. Sorry.
		throw new Error('Environment not supported');
	}
})();