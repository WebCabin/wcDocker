var miniExcludes = {
		"dcl/AUTHORS": 1,
		"dcl/CONTRIBUTING.md": 1,
		"dcl/LICENSE": 1,
		"dcl/README.md": 1,
		"dcl/package": 1
	},
	isTestRe = /\/tests\//;

var profile = {
	resourceTags: {
		test: function(filename, mid){
			return isTestRe.test(filename);
		},

		miniExclude: function(filename, mid){
			return /\/tests\//.test(filename) || mid in miniExcludes;
		},

		amd: function(filename, mid){
			return /\.js$/.test(filename);
		}
	}
};
