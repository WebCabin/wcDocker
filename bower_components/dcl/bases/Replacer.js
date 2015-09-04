(function(factory){
	if(typeof define != "undefined"){
		define(["../mini"], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory(require("../mini"));
	}else{
		dclBasesReplacer = factory(dcl);
	}
})(function(dcl){
	"use strict";
	return dcl(null, {
		declaredClass: "dcl/bases/Replacer",
		constructor: function(x){
			var empty = {};
			dcl.allKeys(x).forEach(function(name){
				if(name in this){
					var t = x[name], e = empty[name];
					if(t !== e){
						this[name] = t;
					}
				}
			}, this);
		}
	});
});
