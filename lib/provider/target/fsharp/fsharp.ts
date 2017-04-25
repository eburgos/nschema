/** 
@module nschema/provider/target/javascript/javascript
@author Eduardo Burgos <eburgos@gmail.com>
*/
import fs = require('fs')
import path = require('path')
import {all, defer} from 'ninejs/core/deferredUtils'
import {Definition, NineSchemaConfig, NSchemaInterface, Target } from "../../../model";
import {TemplateFunction} from "ejs";

declare let require: (name: string) => any;

export interface FSharpConfig extends Definition {
	/*
	Reference to fsharp class. This is internal to FSharp generation.
	 */
	$fsharp: FSharp;
}

export class FSharp {
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
					m.fsharp = self;
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
	generate (nschema: NSchemaInterface, nsconfig:NineSchemaConfig, template:TemplateFunction, target: Target) {
		let config: FSharpConfig = nsconfig as FSharpConfig;
		config.$nschema = nschema;
		config.$fsharp = this;
		config.$target = target;
		var result = template(config);
		var filepath,
			location = target.location;
		if (location.indexOf('.') === 0) {
			filepath = path.resolve(process.cwd(), location, config.namespace, (target.$fileName || (config.name + '.fs')));
		}
		else {
			filepath = path.resolve(location, config.namespace, (config.$fileName || (config.name + '.fs')));
		}
		console.log('writing to file: ' + filepath);
		return nschema.writeFile(filepath, result).then(null, function (err) {
			console.log('error: ');
			console.log(err);
		});
	}
	typeName ($nschemaType: any, $nschema: NSchemaInterface, namespace: string) {
		let result: string;
		var typeMap = function (t: string) {
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
			let $modifier = $nschemaType.modifier;
			let modifierArr: string[];
			if (!$nschema.isArray($modifier)) {
				modifierArr = [$modifier];
			}
			else {
				modifierArr = $modifier;
			}
			modifierArr.forEach(function (item) {
				result += ' ' + item;
			});
		}
		return result;
	}
}

let fsharp = new FSharp();

export default fsharp;
