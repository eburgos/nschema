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
	type: 'service',
	language: 'javascript',
	name: 'amqpRpc',
	init: function (fsharp, nschema, done) {
		this.fsharp = fsharp;
		templates.consumer = nschema.buildTemplate(nschema.path.resolve(__dirname, 'serviceConsumer.ejs'));
		templates.producer = nschema.buildTemplate(nschema.path.resolve(__dirname, 'serviceProducer.ejs'));
		['consumer', 'producer']
			.forEach(function (serviceType) {
				nschema.register('target', {
					type: 'service',
					language: 'javascript',
					bind: 'amqpRpc',
					serviceType: serviceType,
					generate: function (config, nschema, target) {
						return baseGenerate(config, nschema, target, templates[serviceType], fsharp);
					}
				});
			});
		done();
	}
};