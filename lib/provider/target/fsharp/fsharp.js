/** 
@module nschema/provider/target/fsharp/fsharp
@author Eduardo Burgos <eburgos@gmail.com>
*/
(function () {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		isDojo = isAmd && define.amd.vendor === 'dojotoolkit.org',
		isNode = (typeof(window) === 'undefined'),
		req = (isDojo && isNode)? global.require : require;

	/**
	*/
	function moduleExport() {
		var fs = req('fs'),
			path = req('path'),
			Q = req('kew');
		var $_typeMap = function (t) {
			switch (t) {
				case 'int':
					return 'int';
				case 'float':
					return 'float';
				case 'string':
					return 'string';
			}
			return 'string';
		};
		var fsharp = {
			name: 'fsharp',
			init: function (nschema, done) {
				var providerPath = path.resolve(__dirname, 'bind'),
					self = this;
				Q.all(
					fs
						.readdirSync(
							providerPath
						)
						.filter(function (item) {
							return fs.statSync(path.resolve(providerPath, item)).isDirectory();
						})
						.map(function (d) {
							return fs.readdirSync(path.resolve(providerPath, d)).map(function (i) {
								return path.resolve(providerPath, d, i);
							});
						})
						.reduce(function(a, b) {
							return a.concat(b);
						})
						.filter(fs.existsSync)
						.map(require)
						.map(function (m) {
							var mLoad = Q.defer();
							if (typeof(m.init) === 'function') {
								m.init(self, nschema, function (err) {
									if (err) {
										mLoad.reject(err);
									}
									else {
										mLoad.resolve(true);
									}
								});
							}
							else {
								mLoad.resolve(true);
							}
							return mLoad.promise;
						})
				)
				.fail(function (err) {
					console.log(err);
					done(err);
				})
				.then(function () {
					done();
				});
			},
			generate: function (nschema, config, template, target) {
				config.$nschema = nschema;
				config.$fsharp = this;
				config.$target = target;
				var result = template(config);
				var filepath,
					location = target.location || target;
				if (location.indexOf('.') === 0) {
					filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.fs')));
				}
				else {
					filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.fs')));
				}
				console.log('writing to file: ' + filepath);
				nschema.writeFile(filepath, result, function (err) {
					if (err) {
						console.log('error: ');
						console.log(err);
					}
				});
			},
			typeName: function ($nschemaType, $nschema, namespace, name) {
				'use strict';
				var $_result;
				if ((typeof($nschemaType)) === 'string') {
					$_result = $_typeMap($nschemaType);
				} else if (typeof($nschemaType) === 'object') {
					var ns = $nschemaType.namespace;
					if (typeof(ns) === 'undefined') {
						ns = namespace || '';
					}
					//Trying if it is a recursive type
					if ((ns === namespace) && ($nschemaType.name === name)) {
						$_result = name;
					}
					else {
						$_result = ((!!ns)?(ns + '.'):'') + $nschemaType.name;
					}
				} else {
					$_result = $_typeMap('string');
				}
				if ($nschemaType.modifier) {
					var $modifier = $nschemaType.modifier;
					if (!$nschema.isArray($modifier)) {
						$modifier = [$modifier];
					}
					$modifier.forEach(function (item) {
						if (typeof(item) === 'string') {
							$_result += ' ' + item;
						}
						else {
							$_result += ' ' + fsharp.typeName(item, $nschema, namespace, name);
						}
					});
				}
				return $_result;
			}
		};
		return fsharp;
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
})(this);