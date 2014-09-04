/**
 @module nschema/provider/type/message
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function() {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
	//	isDojo = isAmd && define.amd.vendor === 'dojotoolkit.org',
		isNode = (typeof(window) === 'undefined');
	// ,
	// excludedConfigNames = ['$type'],
	// req = (isDojo && isNode)? global.require : require;

	/**
	 */
	function moduleExport () {
		function getMessage (ns, name, nschema) {
			var filtered = nschema.context.messages.filter(function (m) {
				return ((m.namespace || '') === (ns || '')) && ((m.name || '') === (name || ''));
			});
			if (filtered.length) {
				return filtered[0];
			}
			return null;
		}
		function processMessage(newConfig, nschema) {
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
		}
		function execute (parentConfig, nschema) {
			nschema.registerObject(parentConfig);
			var newConfig = nschema.objClone(parentConfig);
			processMessage(newConfig, nschema);
			nschema.registerMessage(newConfig);
		}
		return {
			name: 'message',
			init: function (nschema, done) {
				nschema.register('type', this);
				done();
			},
			processMessage: processMessage,
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