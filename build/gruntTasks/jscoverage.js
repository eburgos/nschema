module.exports = function(grunt) {
	'use strict';
	var Q = require('kew');

	grunt.registerTask('jscoverage', 'copy test coverage instrumentation', function ()
	{
		var fs = require('fs'),
			path = require('path');
		function rmdir(dir) {
			if (fs.existsSync(dir)) {
				fs.readdirSync(dir).forEach(function(file) {
					var realPath = path.resolve(dir, file),
						stat = fs.statSync(realPath);
					if (stat.isDirectory()) {
						rmdir(realPath);
					}
					else if (stat.isFile()) {
						fs.unlinkSync(realPath);
					}
				});
				fs.rmdirSync(dir);
			}
		}
		var done = this.async(),
			files = this.filesSrc,
			exclude = (this.options || {}).exclude,
			queues = [],
			command = 'jscoverage';
		if (!fs.existsSync('./coverage')) {
			fs.mkdirSync('./coverage');
		}

		files.forEach(function(file) {
			var childProcess = require('child_process'),
				defer = Q.defer(),
				args;
			queues.push(defer.promise);
			rmdir(path.resolve('./coverage', file));
			args = [file, path.resolve('./coverage', file)];
			if (exclude) {
				args.push('--exclude=' + exclude);
			}
			var mochaPhantom = childProcess.spawn(command, args, { stdio: 'inherit' });
			mochaPhantom.on('exit', function(/*code*/) {
				defer.resolve();
			});
		});
		Q.all(queues).then(function() {
			done();
		});
	});
};
