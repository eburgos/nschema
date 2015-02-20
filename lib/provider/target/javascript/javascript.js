/** 
@module nschema/provider/target/javascript/javascript
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
		var javascript = {
			name: 'javascript',
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
				config.$javascript = this;
				config.$target = target;
				var result = template(config);
				var filepath,
					location = target.location || target;
				if (location.indexOf('.') === 0) {
					filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.js')));
				}
				else {
					filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.js')));
				}
				console.log('writing to file: ' + filepath);
				nschema.writeFile(filepath, result, function (err) {
					if (err) {
						console.log('error: ');
						console.log(err);
					}
				});
			},
			typeName: function ($nschemaType, $nschema, namespace) {
				var result;
				var typeMap = function (t) {
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
				if ((typeof($nschemaType)) === 'string') {
					result = typeMap($nschemaType);
				} else if (typeof($nschemaType) === 'object') {
					var ns = $nschemaType.namespace;
					if (typeof(ns) === 'undefined') {
						ns = namespace || '';
					}
					result = ns + '.' + $nschemaType.name;
				} else {
					result = typeMap('string');
				}
				if ($nschemaType.modifier) {
					var $modifier = $nschemaType.modifier;
					if (!$nschema.isArray($modifier)) {
						$modifier = [$modifier];
					}
					$modifier.forEach(function (item) {
						result += ' ' + item;
					});
				}
				return result;
			}
		};
		return javascript;
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