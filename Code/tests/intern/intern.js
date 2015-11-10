// jshint unused: false
var dojoConfig = { async: true };
define({
	// The port on which the instrumenting proxy will listen
	proxyPort: 9000,

	// A fully qualified URL to the Intern proxy
	proxyUrl: 'http://localhost:9000/',

	// Username and key should be set in the BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables
	tunnel: 'BrowserStackTunnel',

	// See https://www.browserstack.com/automate/capabilities for capabilities and environments
	capabilities: {
		name: 'wcDocker'
	},

	environments: [
		{ browserName: 'internet explorer', version: [ '9', '10', '11' ], platform: 'WINDOWS' },
		{ browserName: 'firefox', platform: [ 'WINDOWS', 'MAC' ] },
		{ browserName: 'chrome', platform: [ 'WINDOWS', 'MAC' ] }
	],

	// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
	maxConcurrency: 2,

	basePath: '../bower_components',

	// Configuration options for the module loader;
	// any AMD configuration options supported by the Dojo loader can be used here
	loaders: {
		'host-browser': 'dojo/dojo.js'
	},
	loaderOptions: {
		// Packages that should be registered with the loader in each testing environment
		packages: [

			{ name: 'wcDocker', location: '../Code' },
			{ name: 'dcl', location: 'dcl' },
			{
				name: 'lodash',
				location: 'lodash-compat'   //points to bower_components/dcl
			}
		]
	},

	// A regular expression matching URLs to files that should not be included in code coverage analysis
	excludeInstrumentation: /^dojox?|^dijit|^dstore|\/node_modules\/|\/tests\/|\/nls\//,

	// Non-functional test suite(s) to run in each browser
	suites: [ 'wcDocker/tests/intern/all' ],

	// Functional test suite(s) to run in each browser once non-functional tests are completed
	functionalSuites: [ 'wcDocker/tests/intern/functional' ]
});
