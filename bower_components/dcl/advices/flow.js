(function(factory){
	if(typeof define != "undefined"){
		define([], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory();
	}else{
		dclAdvicesFlow = factory();
	}
})(function(){
	"use strict";
	var flowStack = [], flowCount = {};
	return {
		advice: function(name){
			return {
				before: function(){
					flowStack.push(name);
					if(flowCount[name]){
						++flowCount[name];
					}else{
						flowCount[name] = 1;
					}
				},
				after: function(){
					--flowCount[name];
					flowStack.pop();
				}
			};
		},
		inFlowOf: function(name){
			return flowCount[name];
		},
		getStack: function(){
			return flowStack;
		},
		getCount: function(){
			return flowCount;
		}
	};
});
