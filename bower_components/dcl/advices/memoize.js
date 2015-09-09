(function(factory){
	if(typeof define != "undefined"){
		define([], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory();
	}else{
		dclAdvicesMemoize = factory();
	}
})(function(){
	"use strict";
	return {
		advice: function(name, keyMaker){
			return keyMaker ?
				{
					around: function(sup){
						return function(){
							var key = keyMaker(this, arguments), cache = this.__memoizerCache, dict;
							if(!cache){
								cache = this.__memoizerCache = {};
							}
							if(cache.hasOwnProperty(name)){
								dict = cache[name];
							}else{
								dict = cache[name] = {};
							}
							if(dict.hasOwnProperty(key)){
								return dict[key];
							}
							return dict[key] = sup ? sup.apply(this, arguments) : undefined;
						}
					}
				} :
				{
					around: function(sup){
						return function(first){
							var cache = this.__memoizerCache, dict;
							if(!cache){
								cache = this.__memoizerCache = {};
							}
							if(cache.hasOwnProperty(name)){
								dict = cache[name];
							}else{
								dict = cache[name] = {};
							}
							if(dict.hasOwnProperty(first)){
								return dict[first];
							}
							return dict[first] = sup ? sup.apply(this, arguments) : undefined;
						}
					}
				};
		},
		guard: function(name){
			return {
				after: function(){
					var cache = this.__memoizerCache;
					if(cache && name){
						delete cache[name]
					}else{
						this.__memoizerCache = {};
					}
				}
			};
		}
	};
});
