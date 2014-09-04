/**
 @module nschema/nschema
 @author Eduardo Burgos <eburgos@gmail.com>
 */
(function () {
	'use strict';
	var isAmd = (typeof(define) !== 'undefined') && define.amd,
		isNode = (typeof(window) === 'undefined'),
		req = require;
	/**
	@exports NSchema
	 */
	function moduleExport (require) {
		var fs = require('fs'),
			path = require('path'),
			ejs = require('ejs'),
			Q = require('kew');
		function createDirectorySync (dirpath){
			var seps = dirpath.split(path.sep),
				tried = [];
			seps.forEach(function (item) {
				tried.push(item);
				var tryDir = tried.join(path.sep);
				if (tryDir) {
					if (!fs.existsSync(tryDir)) {
						fs.mkdirSync(tryDir);
					}
				}
			});
		}
		function isArray(obj) {
			return Object.prototype.toString.call( obj ) === '[object Array]';
		}
		function objClone (obj) {
			var r,
				cnt,
				len,
				p;
			if ((obj === null) || (obj === undefined)){
				return obj;
			}
			if (isArray(obj)) {
				r = [];
				len = obj.length;
				for (cnt = 0; cnt < len; cnt += 1) {
					r.push(objClone(obj[cnt]));
				}
			} else if (typeof(obj) === 'object') {
				r = {};
				for (p in obj) {
					if (obj.hasOwnProperty(p)) {
						r[p] = objClone(obj[p]);
					}
				}
			}
			else {
				r = obj;
			}
			return r;
		}
		function mixinRecursive(obj, target, filter) {
			var p;
			for(p in target) {
				if (target.hasOwnProperty(p)) {
					if (!filter || !filter(obj, target, p)) {
						if (!isArray(obj[p]) && (!isArray(target[p])) && (typeof(obj[p]) === 'object') && (typeof(target[p]) === 'object')) {
							mixinRecursive(obj[p], target[p]);
						}
						else {
							obj[p] = target[p];
						}
					}
				}
			}
		}
		function writeFile (filename, content, callback) {
			var dirname = path.dirname(filename);
			try {
				createDirectorySync(dirname);
				fs.writeFile(filename, content, callback);
			}
			catch (err) {
				callback(err);
			}
		}
		function registerBasicTypes (nschema) {
			[{
				'$type': 'object',
				'name': 'int',
				'namespace': '',
				'properties': {

				},
				'bind': {
				}
			}, {
				'$type': 'object',
				'name': 'float',
				'namespace': '',
				'properties': {

				},
				'bind': {
				}
			}, {
				'$type': 'object',
				'name': 'string',
				'namespace': '',
				'properties': {

				},
				'bind': {
				}
			}, {
				'$type': 'object',
				'name': 'boolean',
				'namespace': '',
				'properties': {

				},
				'bind': {
				}
			}]
				.forEach(
					nschema
						.registerObject
						.bind(nschema)
				);
		}
		var NSchema = function () {
			this.sources = {};
			this.targets = [];
			this.types = {};
			this.context = {
				objects: [],
				messages: [],
				services: []
			};

			this.dotSettings = {};
			this.mixinRecursive(this.dotSettings, this.ejsSettings);
			this.mixinRecursive(this.dotSettings, { });
			registerBasicTypes(this);
		};
		mixinRecursive(NSchema.prototype, {
			require: req,
			dirname: __dirname,
			path: path,
			isArray: isArray,
			objClone: objClone,
			mixinRecursive: mixinRecursive,
			writeFile: writeFile,
			ejs: ejs,
			ejsSettings: {
				debug: false,
				client: true,
				open: '{{',
				close: '}}'
			},
			utils: {
				initialCaps: function (n) {
					if (!n) {
						return n;
					}
					return n[0].toUpperCase() + n.substr(1);
				}
			},
			init: function (loadPath) {
				var self,
					providerPath;
				if (this.loadDefer) {
					return this.loadDefer.promise;
				}
				else {
					self = this;
					providerPath = (!!loadPath) ? loadPath : path.resolve(__dirname, 'provider');
					this.loadDefer = Q.all(
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
							.filter(function (d) {
								var dir = path.resolve(providerPath, d),
									basename = path.basename(dir);
								return fs.existsSync(path.resolve(dir, basename + '.js'));
							})
							.map(function (d) {
								var dir = path.resolve(providerPath, d),
									basename = path.basename(dir);
								return path.resolve(dir, basename);
							})
							.map(require)
							.map(function (m) {
								var mLoad = Q.defer();
								m.init(self, function (err) {
									if (err) {
										mLoad.reject(err);
									}
									else {
										mLoad.resolve(true);
									}
								});
								return mLoad.promise;
							})
					)
					.fail(function (err) {
						console.log(err);
						throw err;
					})
					.then(function () {
						return self;
					});

					return this.loadDefer.promise;
				}
			},
			getObject: function (namespace, name) {
				var r = this.context.objects.filter(function (t) {
					return ((t.namespace || '') === (namespace || '')) && ((t.name || '') === (name || ''));
				});
				if (r.length) {
					return r[0];
				}
				return null;
			},
			register: function (type, obj) {
				switch (type) {
					case 'source':
						this.sources[obj.name] = obj;
						break;
					case 'target':
						this.targets.push(obj);
						break;
					case 'type':
						this.types[obj.name] = obj;
						break;
				}
			},
			registerObject: function (typeConfig) {
				var t = this.getObject(typeConfig.namespace, typeConfig.name);
				if (t) {
					throw new Error('type ' + (typeConfig.namespace || '') + '::' + (typeConfig.name || '') +' already exists');
				}
				this.context.objects.push(typeConfig);
			},
			getMessage: function (namespace, name) {
				var r = this.context.messages.filter(function (t) {
					return ((t.namespace || '') === (namespace || '')) && ((t.name || '') === (name || ''));
				});
				if (r.length) {
					return r[0];
				}
				return null;
			},
			registerMessage: function (typeConfig) {
				var t = this.getMessage(typeConfig.namespace, typeConfig.name);
				if (t) {
					throw new Error('type ' + (typeConfig.namespace || '') + '::' + (typeConfig.name || '') +' already exists');
				}
				this.context.messages.push(typeConfig);
			},
			getService: function (namespace, name) {
				var r = this.context.services.filter(function (t) {
					return ((t.namespace || '') === (namespace || '')) && ((t.name || '') === (name || ''));
				});
				if (r.length) {
					return r[0];
				}
				return null;
			},
			registerService: function (serviceConfig) {
				var t = this.getService(serviceConfig.namespace, serviceConfig.name),
					p,
					operations;
				if (t) {
					throw new Error('type ' + (serviceConfig.namespace || '') + '::' + (serviceConfig.name || '') +' already exists');
				}
				this.context.services.push(serviceConfig);
			},
			getTarget: function (obj) {
				function isValidProperty (k) {
					return k !== 'location' && (k.indexOf('$') !== 0);
				}
				var getCriteria = function (obj) {
						return Object
							.keys(obj)
							.filter(isValidProperty)
							.map(function (k) {
								return k + ' = \'' + obj[k] + '\'';
							})
							.join(' AND ');
					},
					targets = this.targets.filter(function (tgt) {
					var p;
					for (p in obj) {
						if (obj.hasOwnProperty(p) && isValidProperty(p)) {
							if (tgt[p] !== obj[p]) {
								return false;
							}
						}
					}
					return true;
				});
				if (targets.length > 1) {
					console.log('vienen targets');
					console.log(targets);
					throw new Error('multiple targets for: ' + getCriteria(obj));
				}
				else if (targets.length === 1) {
					return targets[0];
				}
				else {
					throw new Error('Unsupported target: ' + getCriteria(obj));
				}
			},
			buildTemplate: function (filename) {
				var tpl = fs.readFileSync(filename, { encoding: 'utf-8' });
				this.dotSettings.filename = filename;
				var compiled = ejs.compile(tpl, this.dotSettings);
	//				console.log('File name: ' + filename);
	//				console.log(compiled.toString());
				return compiled;
			},
			generate: function (parentConfig, config) {
				if (!config) {
					config = parentConfig || {};
					parentConfig = this.globalConfig || {};
				}
				var type = config.$type,
					typeProvider;
				if (this.verbose) {
					console.log('loading nschema provider: ' + type);
				}
				typeProvider = this.types[type];
				if (!typeProvider) {
					throw new Error('Unknown nschema type provider: ' + type);
				}
				parentConfig = objClone(parentConfig);
				mixinRecursive(parentConfig, config);
				return typeProvider.execute(parentConfig, this);
			},
			walk: function walk(dir, done) {
				var results = [];
				fs.readdir(dir, function(err, list) {
					if (err) {
						return done(err);
					}
					var i = 0;
					(function next() {
						var file = list[i];
						i += 1;
						if (!file) {
							return done(null, results);
						}
						file = dir + '/' + file;
						fs.stat(file, function(err, stat) {
							/* jshint unused: true */
							if (stat && stat.isDirectory()) {
								walk(file, function(err, res) {
									results = results.concat(res);
									next();
								});
							} else {
								results.push(file);
								next();
							}
						});
					})();
				});
			}
		});
		NSchema.generate = function (parentConfig, config) {
			var n = new NSchema();
			return n
				.init()
				.fail(function (err) {
					console.log('failed to load NSchema');
					console.log(err);
					throw err;
				})
				.then(function (nschema) {
					return nschema.generate(parentConfig, config);
				})
				.fail(function (err) {
					console.log('NSchema failed to generate');
					console.log(err);
					if (err.stack) {
						console.log(err.stack);
					}
					throw err;
				});
		};
		return NSchema;
	}
	if (isAmd) { //AMD
		//Trying for RequireJS and hopefully every other
		define(['require'], moduleExport);
	} else if (isNode) { //Server side
		module.exports = moduleExport(req);
	} else {
		// plain script in a browser
		throw new Error('Non AMD environments are not supported');
	}
})();