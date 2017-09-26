/** 
@module nschema/provider/target/javascript/javascript
@author Eduardo Burgos <eburgos@gmail.com>
*/
import fs = require('fs')
import path = require('path')
import {all, defer} from 'ninejs/core/deferredUtils'
import {Definition, NineSchemaConfig, NSchemaInterface, Target } from '../../../model';
import {TemplateFunction} from 'ejs';

declare let require: (name: string) => any;

let modifierMap = (modifier: string) => {
	switch (modifier) {
		case 'list':
			return '[]';
		case 'array':
			return '[]';
		default:
			return modifier;
	}
};

export interface TypeScriptContext {
	imports: {
		[name: string]: {
			[name: string]: boolean;
		}
	}
}

export interface TypeScriptConfig extends Definition {
	/*
	Reference to typescript class. This is internal to TypeScript generation.
	 */
	$typescript: TypeScript;
	$context: TypeScriptContext;
	$skipWrite: boolean;
}

export type RestClientStrategy =
	'Angular2'
	//NineJs;


export interface TypeScriptTarget extends Target {
	restClientStrategy?: RestClientStrategy;
}

export class TypeScript {
	init (nschema: NSchemaInterface) {
		var providerPath = path.resolve(__dirname, 'bind'),
			self = this;
		return all(
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
				.filter(item => {
					return ((path.extname(item) === '.js') && fs.existsSync(item));
				})
				.map(require)
				.map(function (m) {
					if (m['default']) {
						m = m['default'];
					}
					var mLoad = defer();
					m.typescript = self;
					if (typeof(m.init) === 'function') {
						m.init(nschema).then(() => {
							mLoad.resolve(true);
						}, (err: Error) => {
							mLoad.reject(err);
						});
					}
					else {
						mLoad.resolve(true);
					}
					return mLoad.promise;
				})
		)
		.then(() => {}, (err) => {
			console.log(err);
		});
	}
	generate (nschema: NSchemaInterface, _nsconfig:NineSchemaConfig, template:TemplateFunction, target: Target) {
		var nsconfig: any = _nsconfig.$u.clone(_nsconfig);
		let config: TypeScriptConfig = nsconfig as TypeScriptConfig;
		config.$nschema = nschema;
		config.$typescript = this;
		config.$target = target;
		if (typeof(config.$skipWrite) === 'undefined') {
			config.$skipWrite = false;
		}
		if (config.$context) {
			throw new Error('must not have a $context variable');
		}
		config.$context = {
			imports: {}
		};
		var result = template(config);

		if (config.$skipWrite) {
			return Promise.resolve({
				generated: result,
				config: config
			});
		}
		else {
			var filepath,
				location = target.location;
			if (location.indexOf('.') === 0) {
				filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.ts')));
			}
			else {
				filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.ts')));
			}
			console.log('typescript: writing to file: ' + filepath);
			return nschema.writeFile(filepath, result).then(_ => {
                return {
                    generated: result,
                    config: config
                };
			}, function (err) {
				console.log('error: ');
				console.log(err);
			});
		}
	}
	typeName ($nschemaType: any, $nschema: NSchemaInterface, namespace: string, name: string, context: any) {
		let result: string;
		var typeMap = function (t: string) {
			switch (t) {
				case 'int':
					return 'number';
				case 'float':
					return 'number';
				case 'string':
					return 'string';
				case 'bool':
					return 'boolean';
                case 'Date':
                    return 'Date';
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
			if (ns !== namespace) {
				if (!context.imports[ns]) {
					context.imports[ns] = {};
				}
				context.imports[ns][$nschemaType.name] = true;
			}
			result = $nschemaType.name;
		} else {
			result = typeMap('string');
		}
		if ($nschemaType && $nschemaType.modifier) {
			let $modifier = $nschemaType.modifier;
			let modifierArr: string[];
			if (!$nschema.isArray($modifier)) {
				modifierArr = [$modifier];
			}
			else {
				modifierArr = $modifier;
			}
			modifierArr.forEach(function (item) {
				result += ' ' + modifierMap(item);
			});
		}
		return result;
	}
}

let typescript = new TypeScript();

export default typescript;
