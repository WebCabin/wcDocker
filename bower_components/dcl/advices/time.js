(function(factory){
	if(typeof define != "undefined"){
		define([], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory();
	}else{
		dclAdvicesTime = factory();
	}
})(function(){
	"use strict";
	var uniq = 0;
	return function(name){
		var inCall = 0, label = name || ("Timer #" + uniq++);
		return {
			before: function(){
				if(!(inCall++)){
					console.time(label);
				}
			},
			after: function(){
				if(!--inCall){
					console.timeEnd(label);
				}
			}
		};
	};
});
