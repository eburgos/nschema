/**
 @module nschema/provider/source/json
 @author Eduardo Burgos <eburgos@gmail.com>
 */
import {NineSchemaConfig, NSchemaInterface, SourceBind} from "../../../model";


/*
@param {string} payload - .
@returns json promise
 */
function getData(payload: string) {
	return Promise.resolve(JSON.parse(payload));
}

/*
@alias module:nschema/sourceProviders/nschemaJson
 */
let source: SourceBind = {
	type: 'source',
	name: 'json',
	description: 'Reads config data from json',
	init: function (nschema) {
		return nschema.registerSource(this);
	},
	getData: getData
};

export default source;