/**
 @module nschema/provider/type/clean
 @author Eduardo Burgos <eburgos@gmail.com>
 */

import fs = require('fs')
import path = require('path')
import {Definition, NSchemaInterface, NSchemaPlugin} from "../../../model";

let excludedConfigNames = ['$type', '$namespace', 'list'];

function deleteFolderRecursive (folderPath: string) {
	var files = [];
	if( fs.existsSync(folderPath) ) {
		files = fs.readdirSync(folderPath);
		files.forEach ( function (file: string) {
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
function execute (parentConfig: Definition, nschema: NSchemaInterface) {
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
	return Promise.resolve(true);
}
let clean: NSchemaPlugin = {
	type: 'type',
	name: 'clean',
	description: 'Cleans directories. Normally used prior generation.',
	init: function (nschema: NSchemaInterface) {
		nschema.register('type', this);
		return Promise.resolve(null);
	},
	execute: execute
};


export default clean;