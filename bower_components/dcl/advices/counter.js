(function(factory){
	if(typeof define != "undefined"){
		define(["../dcl"], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory(require("../dcl"));
	}else{
		dclAdvicesCounter = factory(dcl);
	}
})(function(dcl){
	"use strict";
	var Counter = new dcl(null, {
		declaredClass: "dcl/advices/counter/Counter",
		constructor: function(){
			this.reset();
		},
		reset: function(){
			this.calls = this.errors = 0;
		},
		advice: function(){
			var self = this;
			return {
				before: function(){
					++self.calls;
				},
				after: function(args, result){
					if(result instanceof Error){
						++self.errors;
					}
				}
			};
		}
	});

	return function(){ return new Counter; };
});
