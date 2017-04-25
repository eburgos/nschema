import minimist = require('minimist')
import { features, generate } from './lib/nschema'
import path = require('path')

declare let require: (name: string) => any;

let argv = minimist(process.argv.slice(2));
let files: string[] = argv._;


if (argv['features']) {
	features();
}
else {
	files.forEach (function (item) {
		if (item.indexOf ('/') !== 0) {
			item = path.resolve (process.cwd (), item);
		}
		let r = require (item);
		generate ({$nschemaLocation: path.dirname (item)}, r);
	});
}