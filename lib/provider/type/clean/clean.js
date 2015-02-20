/**
 @module nschema/provider/type/clean
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function() {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		isDojo = isAmd && define.amd.vendor === 'dojotoolkit.org',
		isNode = (typeof(window) === 'undefined'),
		excludedConfigNames = ['$type', '$namespace', 'list'],
		req = (isDojo && isNode)? global.require : require;

	/**
	 */
	function moduleExport (fs, path) {
		function deleteFolderRecursive (folderPath) {
			var files = [];
			if( fs.existsSync(folderPath) ) {
				files = fs.readdirSync(folderPath);
				files.forEach ( function (file) {
					var curPath = folderPath + '/' + file;
					if(fs.lstatSync(curPath).isDirectory()) { // recurse
						deleteFolderRecursive(curPath);
					} else { // delete file
						fs.unlinkSync(curPath);
					}
				});
				fs.rmdirSync(folderPath);
			}
		}
		function execute (parentConfig, nschema) {
			var cnt,
				arr = parentConfig.target.map(function(i) { return i.location; }),
				len = arr.length,
				cur,
				realFolder,
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
				realFolder = path.resolve(cur);
				if (fs.existsSync(realFolder)) {
					if (fs.lstatSync(realFolder).isDirectory()) {
						console.log('deleting folder ' + realFolder);
						deleteFolderRecursive(realFolder);
					}
					else {
						console.log('deleting file ' + realFolder);
						fs.unlinkSync(realFolder);
					}
				}
			}
		}
		return {
			name: 'clean',
			init: function (nschema, done) {
				nschema.register('type', this);
				done();
			},
			execute: execute
		};
	}
	if (isAmd) { //AMD
		//Trying for RequireJS and hopefully every other
		define(['fs', 'path'], moduleExport);
	} else if (isNode) { //Server side
		module.exports = moduleExport(req('fs'), req('path'));
	} else {
		// plain script in a browser
		// Non AMD/CJS environments are not supported. Figure it out on your own. Sorry.
		throw new Error('Environment not supported');
	}
})();