/**
 @module nschema/provider/source/json
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function() {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		isNode = (typeof(window) === 'undefined'),
		req = require;

	function moduleExport(def) {
		/*
		@param {string} payload - .
		@returns json promise
		 */
		function getData(payload) {
			var d = def.defer();
			d.resolve(JSON.parse(payload));
			return d.promise;
		}
		/*
		@alias module:nschema/sourceProviders/nschemaJson
		 */
		return {
			name: 'json',
			init: function (nschema, done) {
				nschema.register('source', this);
				done();
			},
			getData: getData
		};
	}
	if (isAmd) { //AMD
		//Trying for RequireJS and hopefully every other
		define(['kew'], moduleExport);
	} else if (isNode) { //Server side
		module.exports = moduleExport(req('kew'));
	} else {
		// plain script in a browser
		throw new Error('Non AMD environments are not supported');
	}
})();