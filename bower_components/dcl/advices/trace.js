(function(factory){
	if(typeof define != "undefined"){
		define([], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory();
	}else{
		dclAdvicesTrace = factory();
	}
})(function(){
	"use strict";
	var lvl = 0;
	function rep(ch, n){
		if(n < 1){ return ""; }
		if(n == 1){ return ch; }
		var h = rep(ch, Math.floor(n / 2));
		return h + h + ((n & 1) ? ch : "");

	}
	function pad(value, width, ch){
		var v = value.toString();
		return v + rep(ch || " ", width - v.length);
	}
	return function(name, level){
		return {
			before: function(){
				++lvl;
				console.log((level ? pad(lvl, 2 * lvl) : "") + this + " => " +
					name + "(" + Array.prototype.join.call(arguments, ", ") + ")");
			},
			after: function(args, result){
				console.log((level ? pad(lvl, 2 * lvl) : "") + this + " => " +
					name + (result && result instanceof Error ? " throws" : " returns") +
					" " + result);
				--lvl;
			}
		};
	};
});
