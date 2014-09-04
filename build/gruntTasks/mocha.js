module.exports = function(grunt) {
	'use strict';
	var Q = require('kew');

	grunt.registerTask('mocha', 'run Phantomjs tests with Mocha', function()
	{
		var done = this.async(),
			files = this.filesSrc || [],
			queues = [],
			command = 'mocha-phantomjs',
			platform = require('os').platform();
		if ((/win/).test(platform)) {
			command += '.cmd';
		}

		files.forEach(function(file) {
			var childProcess = require('child_process'),
				defer = Q.defer();
			queues.push(defer.promise);
			var mochaPhantom = childProcess.spawn(command, [file], { stdio: 'inherit' });
			mochaPhantom.on('exit', function(/*code*/) {
				defer.resolve();
			});
		});
		Q.all(queues).then(function() {
			done();
		});
	});
};
