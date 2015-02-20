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
		var typeMap = function (t) {
			switch (t) {
				case 'int':
					return 'int';
				case 'float':
					return 'float';
				case 'bool':
					return 'bool';
				case 'date':
					return 'System.DateTime';
				case 'byte':
					return 'byte';
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
				function fname () {
					return (config.fileNamePrefix || '') +
						(target.$fileName || config.$fileName || (config.name + '.fs'));
				}
				var result = template(config);
				var filepath,
					location = target.location || target;
				if (location.indexOf('.') === 0) {
					filepath = path.resolve(process.cwd(), location, config.namespace, fname());
				}
				else {
					filepath = path.resolve(location, config.namespace, fname());
				}
				var fn;
				if (config.append) {
					console.log('appending to file: ' + filepath);
					fn = nschema.appendFile;
				}
				else {
					console.log('writing to file: ' + filepath);
					fn = nschema.writeFile;
				}
				fn.call(nschema, filepath, result, function (err) {
					if (err) {
						console.log('error: ');
						console.log(err);
					}
				});
			},
			typeName: function ($nschemaType, $nschema, namespace, name) {
				var result;
				function dependents(typeObj) {
					if (typeObj.dependents) {
						return typeObj.dependents;
					}
					var props = typeObj.properties || {};
					var deps = Object.keys(props)
						.map(function (k) {
							return props[k].type;
						})
						.filter(function (p) {
							return (typeof(p) === 'object') && (p.namespace !== '');
						});
					typeObj.dependents = deps;
					return deps;
				}
				function isMutuallyRecursive() {
					//If $nschemaType is not an object then just return false as it doesn't make sense
					if (typeof($nschemaType) !== 'object') {
						return false;
					}
					var typeNs = $nschemaType.namespace;
					if (typeof(typeNs) === 'undefined') {
						typeNs = namespace;
					}
					var typeObj = $nschema.getObject(typeNs, $nschemaType.name) || {};
					//first trying because I am mutually recursive with myself
					if ((typeNs === namespace) && ($nschemaType.name === name)) {
						return true;
					}

					//Now trying with others
					return dependents(typeObj)
						.map(function (d) {
							var typeNs = d.namespace;
							if (typeof(d.namespace) === 'undefined') {
								typeNs = namespace;
							}
							return $nschema.getObject(typeNs, d.name);
						})
						.filter(function (subDependent) {
							if (!subDependent) {
								return false;
							}
							var x = (
								(subDependent.name === name) &&
								(
									(typeof(subDependent.namespace) === 'undefined') || (subDependent.namespace === namespace)
								)
							);
							return x;
						})
						.length > 0;
				}
				function modifiers($nschemaType, result) {
					if ($nschemaType.modifier) {
						var $modifier = $nschemaType.fsharpModifier || $nschemaType.modifier;
						if (!$modifier) {
							$modifier = [];
						}
						else if (!$nschema.isArray($modifier)) {
							$modifier = [$modifier];
						}
						$modifier.forEach(function (item) {
							if (typeof(item) === 'string') {
								if (item === 'stringdict') {
									result = 'System.Collections.Generic.Dictionary<string, ' + result + '>';
								}
								else {
									result += ' ' + item;
								}
							}
							else {
								result += ' ' + fsharp.typeName(item, $nschema, namespace, name);
							}
						});
					}
					return result;
				}
				if (isMutuallyRecursive()) {
					//console.log($nschemaType.namespace + '::' + $nschemaType.name + ' is mutually recursive with ' + namespace + '::' + name);
					result = $nschemaType.name;
				}
				else if ((typeof($nschemaType)) === 'string') {
					result = typeMap($nschemaType);
				} else if (typeof($nschemaType) === 'object') {
					var ns = $nschemaType.namespace;
					if (typeof(ns) === 'undefined') {
						ns = namespace || '';
					}
					//Trying if it is a recursive type
					if ((ns === namespace) && ($nschemaType.name === name)) {
						result = name;
					}
					else if (ns === '') {
						result = typeMap($nschemaType.name);
					}
					else {
						result = ((!!ns)?(ns + '.'):'') + $nschemaType.name;
					}
				} else {
					result = typeMap('string');
				}

				result = modifiers($nschemaType, result);
				return result;
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