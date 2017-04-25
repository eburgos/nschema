/**
 @module nschema/nschema
 @author Eduardo Burgos <eburgos@gmail.com>
 */

import fs = require('fs');
import path = require('path');
import ejs = require('ejs');
import { all, defer } from 'ninejs/core/deferredUtils'
import {
	Definition,
	NineSchemaConfig, NSchemaInterface, SourceBind,
	TargetBind, NSchemaPlugin,
	Utils, NSchemaContext, NSchemaService, NSchemaObject
} from './model'

declare let require: (name: string) => any;
let indent = 0;
let utils: Utils = {
	i: function (amount: number, seed: string) {
		var r = '';
		for (var cnt = 0; cnt < (amount || 0); cnt += 1) {
			r += seed;
		}
		return r;
	},
	clone: (obj: any) => {
		if (null == obj || "object" != typeof obj) return obj;
		var copy: any = {};
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	}
};

function createDirectorySync (dirpath: string){
	let seps = dirpath.split(path.sep),
		tried: string[] = [];
	seps.forEach(item => {
		tried.push(item);
		var tryDir = tried.join(path.sep);
		if (tryDir) {
			if (!fs.existsSync(tryDir)) {
				fs.mkdirSync(tryDir);
			}
		}
	});
}
function isArray(obj: any): obj is any[] {
	return Object.prototype.toString.call( obj ) === '[object Array]';
}
function objClone (obj: any): any {
	let cnt,
		len,
		p;
	if ((obj === null) || (obj === undefined)){
		return obj;
	}
	if (isArray(obj)) {
		let r = [];
		len = obj.length;
		for (cnt = 0; cnt < len; cnt += 1) {
			r.push(objClone(obj[cnt]));
		}
		return r;
	} else if (typeof(obj) === 'object') {
		let r: any = {};
		for (p in obj) {
			if (obj.hasOwnProperty(p)) {
				r[p] = objClone(obj[p]);
			}
		}
		return r;
	}
	else {
		return obj;
	}
}
function mixinRecursive(obj: any, target: any, filter?: (o: any, t: any, p: string) => boolean) {
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

function appendFile (filename: string, content: string, callback: (err: Error, data?: any) => void) {
	var dirname = path.dirname(filename);
	try {
		createDirectorySync(dirname);
		fs.appendFile(filename, content, callback);
	}
	catch (err) {
		callback(err);
	}
}
function registerBasicTypes (nschema: NSchema) {
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

export default class NSchema implements NSchemaInterface {
	// Implementing NSchemaInterface
	
	dirname: string = __dirname;
	
	register (type: string, obj: NSchemaPlugin) {
		switch (type) {
			case 'source':
				throw new Error('Cannot register source. Call registerSource() directly');
			case 'target':
				throw new Error('Cannot register target. Call registerTarget() directly');
			case 'service':
			case 'message':
			case 'object':
				throw new Error(`Cannot register ${type}.`);
			case 'type':
				this.types[obj.name] = obj;
				break;
			default:
				if (!this.customPlugins[type]) {
					this.customPlugins[type] = [];
				}
				this.customPlugins[type].push(obj)
				break;
		}
		return Promise.resolve(null);
	}
	
	registerSource (obj: SourceBind) {
		this.sources[obj.name] = obj;
		return Promise.resolve(null);
	}
	
	registerTarget (obj: TargetBind) {
		this.targets.push(obj);
		return Promise.resolve(null);
	}
	
	registerService (serviceConfig: NSchemaService) {
		var t = this.getService(serviceConfig.namespace, serviceConfig.name);
		if (t && !t.$nschemaRegistered) {
			throw new Error('service ' + (serviceConfig.namespace || '') + '::' + (serviceConfig.name || '') +' already exists');
		}
		this.context.services.push(serviceConfig);
		serviceConfig.$nschemaRegistered = true;
	}
	
	registerObject (typeConfig: NSchemaObject) {
		var t = this.getObject(typeConfig.namespace, typeConfig.name);
		if (t && !t.$nschemaRegistered) {
			throw new Error('type ' + (typeConfig.namespace || '') + '::' + (typeConfig.name || '') +' already exists');
		}
		this.context.objects.push(typeConfig);
		typeConfig.$nschemaRegistered = true;
	}
	
	getObject (ns: string, name: string) {
		var r = this.context.objects.filter(function (t: Definition) {
			return ((t.namespace || '') === (ns || '')) && ((t.name || '') === (name || ''));
		});
		if (r.length) {
			return r[0];
		}
		return null;
	}
	
	
	getMessage (ns: string, name: string) {
		var r = this.context.messages.filter(function (t: Definition) {
			return ((t.namespace || '') === (ns || '')) && ((t.name || '') === (name || ''));
		});
		if (r.length) {
			return r[0];
		}
		return null;
	}
	registerMessage (typeConfig: Definition) {
		var t = this.getMessage(typeConfig.namespace, typeConfig.name);
		if (t && !t.$nschemaRegistered) {
			throw new Error('message ' + (typeConfig.namespace || '') + '::' + (typeConfig.name || '') +' already exists');
		}
		this.context.messages.push(typeConfig);
		typeConfig.$nschemaRegistered = true;
	}
	getService (ns: string, name: string) {
		var r = this.context.services.filter(function (t: Definition) {
			return ((t.namespace || '') === (ns || '')) && ((t.name || '') === (name || ''));
		});
		if (r.length) {
			return r[0];
		}
		return null;
	}
	getCustomPlugin (name: string, obj: any): NSchemaPlugin {
		function isValidProperty(k: string) {
			return k !== 'location' && (k.indexOf('$') !== 0);
		}

		let getCriteria = function (obj: any) {
				return Object
                    .keys(obj)
                    .filter(isValidProperty)
                    .map(function (k) {
						return k + ' = \'' + obj[k] + '\'';
					})
                    .join(' AND ');
		},
		customPlugins = (this.customPlugins[name] || []).filter((target: NSchemaPlugin) => {
			let tgt: any = target;
			var p;
			for (p in obj) {
				if (obj.hasOwnProperty(p) && isValidProperty(p)) {
					if ((tgt[p] !== obj[p]) && (tgt[p] !== '*')) {
						return false;
					}
				}
			}
			return true;
		});
		if (customPlugins.length > 1) {
			throw new Error(`Warning: multiple plugins found for ${getCriteria(obj)}.`);
		}
		else if (customPlugins.length === 1) {
			return customPlugins[0];
		}
		else {
			return null;
		}
	}
	getTarget (obj: any): TargetBind {
		function isValidProperty(k: string) {
			return k !== 'location' && (k.indexOf('$') !== 0);
		}
		
		var getCriteria = function (obj: any) {
			return Object
				.keys(obj)
				.filter(isValidProperty)
				.map(function (k) {
					return k + ' = \'' + obj[k] + '\'';
				})
				.join(' AND ');
		},
		targets = this.targets.filter((target: TargetBind) => {
			let tgt: any = target;
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
			throw new Error('multiple targets for: ' + getCriteria(obj));
		}
		else if (targets.length === 1) {
			return targets[0];
		}
		else {
			throw new Error('Unsupported target: ' + getCriteria(obj));
		}
	}
	
	buildTemplate (filename: string) {
		var tpl = fs.readFileSync(filename, { encoding: 'utf-8' });
		this.dotSettings.filename = filename;
		var compiled = ejs.compile(tpl, this.dotSettings);
		//				console.log('File name: ' + filename);
		//				console.log(compiled.toString());
		return compiled;
	}
	// NSchemaInterface ends
	
	sources: { [name: string]: SourceBind } = {};
	targets: TargetBind[] = [];
	customPlugins: { [name: string]: NSchemaPlugin[]} = {};
	types: { [name:string]: NSchemaPlugin } = {};
	context: NSchemaContext = {
		objects: [],
		messages: [],
		services: []
	};
	dotSettings: any = {};
	loadDefer: Promise<any>;
	globalConfig: NineSchemaConfig;
	verbose: boolean;
	constructor () {
		this.mixinRecursive(this.dotSettings, this.ejsSettings);
		this.mixinRecursive(this.dotSettings, { });
		registerBasicTypes(this);
	}

	require: (name: string) => any;
	
	path: any = path;
	isArray: (obj: any) => obj is any[] = isArray;
	objClone: any = objClone;
	mixinRecursive: any = mixinRecursive;
	writeFile (filename: string, content: string): Promise<any> {
		var dirname = path.dirname(filename);
		createDirectorySync(dirname);
		let result = defer();
		fs.writeFile(filename, content, (err: Error, data: any) => {
			if (err) {
				result.reject(err);
			}
			else {
				result.resolve(data);
			}
		});
		return result.promise;
	}
	appendFile: any = appendFile;
	ejs: any = ejs;
	ejsSettings: any = {
		debug: false,
		client: true,
		open: '<%',
		close: '%>'
	};
	utils: any = {
		initialCaps: function (n: string) {
			if (!n) {
				return n;
			}
			return n[0].toUpperCase() + n.substr(1);
		}
	}
	init (loadPath?: string) {
		let self: NSchema,
			providerPath: string;
		if (this.loadDefer) {
			return this.loadDefer;
		}
		else {
			self = this;
			providerPath = (!!loadPath) ? loadPath : path.resolve(__dirname, 'provider');
			this.loadDefer = all(
				fs
					.readdirSync(
						providerPath
					)
					.filter(function (item: string) {
						return fs.statSync(path.resolve(providerPath, item)).isDirectory();
					})
					.map(function (d: string) {
						return fs.readdirSync(path.resolve(providerPath, d)).map(function (i: string) {
							return path.resolve(providerPath, d, i);
						});
					})
					.reduce(function(a: string[], b: string[]) {
						return a.concat(b);
					})
					.filter(function (d: string) {
						var dir = path.resolve(providerPath, d),
							basename = path.basename(dir);
						return fs.existsSync(path.resolve(dir, basename + '.js'));
					})
					.map(function (d: string) {
						var dir = path.resolve(providerPath, d),
							basename = path.basename(dir);
						return path.resolve(dir, basename);
					})
					.map(require)
					.map(function (m) {
						if (m['default']) {
							m = m['default'];
						}
						return m.init(self);
					})
				)
				.catch(function (err) {
					console.log(err);
					throw err;
				})
				.then(function () {
					return self;
				});

			return this.loadDefer;
		}
	}
	
	
	generate (parentConfig: NineSchemaConfig, config: Definition): Promise<any> {
		if (!config) {
			config = {};
			mixinRecursive(config, parentConfig);
			parentConfig = this.globalConfig || {};
		}
		config.i = indent;
		config.$u = utils;
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
	}
	walk (dir: string, done: (err: Error, data?: string[]) => void) {
		var results: string[] = [];
		let self = this;
		fs.readdir(dir, function(err: Error, list: string[]) {
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
				fs.stat(file, function(err: Error, stat) {
					/* jshint unused: true */
					if (stat && stat.isDirectory()) {
						self.walk(file, function(err, res) {
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
}

export function generate(parentConfig: NineSchemaConfig, config: Definition) {
	var n = new NSchema();
	return n
		.init()
		.catch(function (err: Error) {
			console.log('failed to load NSchema');
			console.log(err);
			throw err;
		})
		.then(function (nschema: NSchema) {
			return nschema.generate(parentConfig, config);
		})
		.catch((err: Error) => {
			console.log('NSchema failed to generate');
			console.log(err);
			if (err.stack) {
				console.log(err.stack);
			}
			throw err;
		});
};
export function features () {
	var n = new NSchema();
	return n
		.init()
		.catch(function (err: Error) {
			console.log('failed to load NSchema');
			console.log(err);
			throw err;
		})
		.then(function (nschema: NSchema) {
			let version: string = require('../package.json').version;
			console.log(`NineSchema version ${version}`);
			console.log();
			console.log('Available bindings:');
			console.log();
			nschema.targets.forEach(target => {
				
				console.log(`	serviceType: '${target.serviceType}'`);
				console.log(`	language: '${target.language}'`);
				console.log(`	bind: '${target.bind}'`);
				console.log(`	description: ${target.description || 'No description provided'}`);
				console.log();
			});
		});
}