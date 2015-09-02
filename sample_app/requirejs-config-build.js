require.config({
	baseUrl: "./build/",

	packages: [{
		name: "myapp",
		location: "../myapp"
	},{
		name: "mypackage",
		location: "../mylocalpackage"
	}],

	map: {
		"mypackage/foo": {
			"mypackage/bar": "../bar-mapped"
		},
        '*':{
            "delite/theme": "xdelite/theme"
        }
	},

	paths: {
		"css": "../css",
		"mypackage/foo": "../patch/foo",
		"angular": "angular/angular",
		"angular-loader": "angular-loader/angular-loader",
		"jquery": "jquery/dist/jquery"
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
		}
	}
});