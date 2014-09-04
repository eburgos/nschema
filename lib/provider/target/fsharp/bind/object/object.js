/**
 * Created by eburgos on 6/13/14.
 */
'use strict';
function baseGenerate (config, nschema, target, template, fsharp) {
	return fsharp.generate(nschema, config, template, target);
}
var templates = {
};
module.exports = {
	type: 'object',
	language: 'fsharp',
	init: function (fsharp, nschema, done) {
		this.fsharp = fsharp;
		templates.object = nschema.buildTemplate(nschema.path.resolve(__dirname, 'class.ejs'));
		nschema.register('target', {
			type: 'object',
			language: 'fsharp',
			generate: function (config, nschema, target) {
				return baseGenerate(config, nschema, target, templates.object, fsharp);
			}
		});
		done();
	}
};