require.config({
	baseUrl: '../../lib/ibm-js/',
	packages: [
        {
            name: "myapp",
            location: "../../apps/delite-app-xfile/myapp"
	    },
        {
            name: "mypackage",
            location: "../mylocalpackage"
	    },
        {
            name: 'jquery',
            location: 'jquery',
            main:'jquery'
        }
    ],


	map: {
		"mypackage/foo": {
			"mypackage/bar": "../bar-mapped"
		},
        '*':{
            "delite/theme": "xdelite/theme",
            "delite/register": "xdelite/register"
        }

	},

	paths: {
		"css": "../../apps/delite-app-xfile/css",
		"mypackage/foo": "../patch/foo",
		"angular": "angular/angular",
		"angular-loader": "angular-loader/angular-loader"
		/*"jquery": "jquery/dist/jquery"*/
	},
	shim: {
		"angular": {
			exports: "angular",
			deps: ["angular-loader", "jquery"]
		},
		"angular-loader": {
		}
	},

	config: {
		"requirejs-dplugins/i18n": {
			locale: "fr-fr"
		},
        'delite/register': {
            theme:'superhero'
        }

	}
});