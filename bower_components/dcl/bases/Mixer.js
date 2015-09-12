(function(factory){
	if(typeof define != "undefined"){
		define(["../mini"], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory(require("../mini"));
	}else{
		dclBasesMixer = factory(dcl);
	}
})(function(dcl){
	"use strict";
	return dcl(null, {
		declaredClass: "dcl/bases/Mixer",
		constructor: function(x){
			dcl.mix(this, x);
		}
	});
});
