(function(factory){
	if(typeof define != "undefined"){
		define(["../dcl"], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory(require("../dcl"));
	}else{
		dclMixinsDestroyable = factory(dcl);
	}
})(function(dcl){
	"use strict";
	var Destroyable = dcl(null, {declaredClass: "dcl/mixins/Destroyable"});
	dcl.chainBefore(Destroyable, "destroy");
	return Destroyable;
});
