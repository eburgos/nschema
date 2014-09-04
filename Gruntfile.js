/*
 * nschema grunt configuration file
 */
function exports(grunt) {
	'use strict';

	var jsFiles = ['bin/ninejs', '*.js', '**/*.js', '!node_modules/**', '!out/**', '!lib/external/**'],
		testFiles = ['**/tests/**/*.js', '!coverage/**', '!**/tests/**/phantom*.js', '!node_modules/**', '!out/**', '!nineplate/tests/template-generated.js'],
		phantomWatch = ['nineplate/tests/phantomTest.js'],
		underscore = require('underscore');

	// Project configuration.
	grunt.initConfig({
		mocha: { //Phantomjs
//			index: {
//				src: ['tests/phantomTest.html']
//			}
		},
		mochaTest: {
			normal: {
				src: testFiles,
				options: {
					reporter: 'spec',
					globals: [],
					require: 'build/coverage'
				}
			},
			watch: {
				src: testFiles,
				options: {
					reporter: 'spec',
					globals: []
				}
			},
			cover: {
				src: testFiles,
				options: {
					reporter: 'html-cov',
					quiet: true,
					captureFile: 'coverage.html',
					globals: []
				}
			}
		},
		watch: {
			jshint : {
				files : jsFiles,
				tasks : 'jshint'
			},
			phantom: {
				files: underscore.union(phantomWatch, jsFiles),
				tasks: ['mocha']
			},
			test: {
				files: underscore.union(testFiles, jsFiles),
				tasks: ['jshint', 'mochaTest:watch', 'mocha']
			}

		},
		jshint: {
			files: jsFiles,
			options: {
				bitwise : true,
				camelcase : true,
				forin : true,
				indent : true,
				noempty : true,
				nonew : true,
				plusplus : true,
				maxdepth : 8,
				maxcomplexity : 10,
				strict : true,
				quotmark : 'single',
				regexp : true,
				unused : 'strict',
				curly : true,
				eqeqeq : true,
				immed : true,
				latedef : true,
				newcap : true,
				noarg : true,
				sub : true,
				undef : true,
				boss : true,
				eqnull : true,
				node : true,
				dojo : false,
				passfail : false,
				trailing : true,
				scripturl : true,
				shadow : true,
				browser : false,
				smarttabs : true,
				globals : {
					localStorage : true,
					define : true
				}
			}
		},
		jscoverage: {
			all: {

			}
		}
	});

	grunt.loadNpmTasks('grunt-mocha-test');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.task.loadTasks('build/gruntTasks');

	grunt.registerTask('test', ['mochaTest', 'mocha']);
	grunt.registerTask('cover', ['jscoverage', 'mochaTest:cover']);
	// Default task.
	grunt.registerTask('default', ['jshint', 'jscoverage', 'test']);
}

module.exports = exports;