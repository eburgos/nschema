/*
 * nschema grunt configuration file
 */
function exports(grunt) {
	'use strict';

	var jsFiles = ['bin/ninejs', '*.js', '**/*.js', '!node_modules/**', '!out/**', '!lib/external/**'],
		testFiles = ['**/tests/**/*.js', '!coverage/**', '!**/tests/**/phantom*.js', '!node_modules/**', '!out/**', '!nineplate/tests/template-generated.js'],
		phantomWatch = ['nineplate/tests/phantomTest.js'],
		underscore = require('underscore');

	require('load-grunt-tasks')(grunt);
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
			phantom: {
				files: underscore.union(phantomWatch, jsFiles),
				tasks: ['mocha']
			},
			test: {
				files: underscore.union(testFiles, jsFiles),
				tasks: ['mochaTest:watch', 'mocha']
			}

		},
		ts: {
			check : {
				tsconfig: './tsconfig.json',
				options: {
					"compiler": (process.env.TS_COMPILER || "./node_modules/typescript/bin/tsc"),
					"noEmit": true
				}
			},
			compile : {
				tsconfig: './tsconfig.json',
				options: {
					"compiler": (process.env.TS_COMPILER || "./node_modules/typescript/bin/tsc"),
					"noResolve": true,
					"declaration": true,
					"failOnTypeErrors": false
				}
			},
			gencheck : {
				tsconfig: './generated/typescriptClient/tsconfig.json',
				options: {
					"compiler": (process.env.TS_COMPILER || "./node_modules/typescript/bin/tsc"),
					"noEmit": true
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
	grunt.registerTask('default', ['ts', 'jscoverage', 'test']);
}

module.exports = exports;