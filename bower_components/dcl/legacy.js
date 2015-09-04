(function(factory){
	if(typeof define != "undefined"){
		define([], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory();
	}else{
		dcl = factory();
	}
})(function(){
	"use strict";

	var shadowedNames = ["hasOwnProperty", "valueOf", "isPrototypeOf", "propertyIsEnumerable",
		"toLocaleString", "toString", "constructor"], op = Object.prototype;
	for(var post in {toString: 1}){
		shadowedNames = [];
	}

	function allKeys(o){
		var keys = [];
		for(var name in o){
			var t = o[name];
			if(t !== op[name] || !(name in op)){
				keys.push(name);
			}
		}
		for(var i = 0; name = shadowedNames[i]; ++i){	// intentional assignment
			var t = o[name];
			if(t !== op[name] || !(name in op)){
				keys.push(name);
			}
		}
		return keys;
	}

	var counter = 0, cname = "constructor", pname = "prototype", empty = {}, mix;

	function dcl(superClass, props){
		var bases = [0], proto, base, ctor, meta, connectionMap,
			output, vector, superClasses, i, j = 0, n;

		if(superClass){
			if(superClass instanceof Array){
				// mixins: C3 MRO
				connectionMap = {};
				superClasses = superClass.slice(0).reverse();
				for(i = superClasses.length - 1; i >= 0; --i){
					base = superClasses[i];
					// pre-process a base
					// 1) add a unique id
					base._uniqueId = base._uniqueId || counter++;
					// 2) build a connection map and the base list
					if((proto = base._meta)){   // intentional assignment
						for(vector = proto.bases, j = vector.length - 1; j > 0; --j){
							n = vector[j]._uniqueId;
							connectionMap[n] = (connectionMap[n] || 0) + 1;
						}
						superClasses[i] = vector.slice(0);
					}else{
						superClasses[i] = [base];
					}
				}
				// build output
				output = {};
				c: while(superClasses.length){
					for(i = 0; i < superClasses.length; ++i){
						vector = superClasses[i];
						base = vector[0];
						n = base._uniqueId;
						if(!connectionMap[n]){
							if(!output[n]){
								bases.push(base);
								output[n] = 1;
							}
							vector.shift();
							if(vector.length){
								--connectionMap[vector[0]._uniqueId];
							}else{
								superClasses.splice(i, 1);
							}
							continue c;
						}
					}
					// error
					dcl._error("cycle", props, superClasses);
				}
				// calculate a base class
				superClass = superClass[0];
				j = bases.length - ((meta = superClass._meta) && superClass === bases[bases.length - (j = meta.bases.length)] ? j : 1) - 1; // intentional assignments
			}else{
				// 1) add a unique id
				superClass._uniqueId = superClass._uniqueId || counter++;
				// 2) single inheritance
				bases = bases.concat((meta = superClass._meta) ? meta.bases : superClass);   // intentional assignment
			}
		}
		// create a base class
		proto = superClass ? dcl.delegate(superClass[pname]) : {};
		// the next line assumes that constructor is actually named "constructor", should be changed if desired
		vector = superClass && (meta = superClass._meta) ? dcl.delegate(meta.weaver) : {constructor: 2};   // intentional assignment

		// create prototype: mix in mixins and props
		for(; j > 0; --j){
			base = bases[j];
			meta = base._meta;
			dcl.mix(proto, meta && meta.ownProps || base[pname]);
			if(meta){
				allKeys(superClasses = meta.weaver).forEach(function(n){	// intentional assignment
					vector[n] = (+vector[n] || 0) | superClasses[n];
				});
			}
		}
		allKeys(props).forEach(function(n){
			if(isSuper(meta = props[n])){  // intentional assignment
				vector[n] = +vector[n] || 0;
			}else{
				proto[n] = meta;
			}
		});

		// create stubs with fake constructor
		//
		meta = {bases: bases, ownProps: props, weaver: vector, chains: {}};
		// meta information is coded like that:
		// bases: an array of super classes (bases) and mixins
		// ownProps: a bag of immediate prototype properties for the constructor
		// weaver: a bag of chain instructions (before is 1, after is 2)
		// chains: a bag of chains (ordered arrays)

		bases[0] = {_meta: meta, prototype: proto};
		buildStubs(meta, proto);
		ctor = proto[cname];

		// put in place all decorations and return a constructor
		ctor._meta  = meta;
		ctor[pname] = proto;
		//proto.constructor = ctor; // uncomment if constructor is not named "constructor"
		bases[0] = ctor;

		// each constructor may have two properties on it:
		// _meta: a meta information object as above
		// _uniqueId: a unique number, which is used to id the constructor

		return dcl._postprocess(ctor);    // fully prepared constructor
	}

	// decorators

	function Super(f){ this.around = f; }
	function isSuper(f){ return f && f.spr instanceof Super; }

	// utilities

	(mix = function(a, b){
		allKeys(b).forEach(function(n){
			a[n] = b[n];
		});
	})(dcl, {
		// piblic API
		mix: mix,
		delegate: function(o){
			return Object.create(o);
		},
		allKeys: allKeys,
		Super: Super,
		superCall: function superCall(f){ return dcl._makeSuper(f); },

		// protected API starts with _ (don't use it!)

		// make a Super marker
		_makeSuper: function makeSuper(advice, S){ var f = function(){}; f.spr = new (S || Super)(advice); return f; },

		// post-processor for a constructor, can be used to add more functionality
		// or augment its behavior
		_postprocess: function(ctor){ return ctor; },   // identity, used to hang on advices

		// error function, augmented by debug.js
		_error: function(msg){ throw Error("dcl: " + msg); },

		// supercall instantiation, augmented by debug.js
		_instantiate: function(advice, previous, node){ var t = advice.spr.around(previous); t.ctr = advice.ctr; return t; },

		// the "buildStubs()" helpers, can be overwritten
		_extractChain: function(bases, name, advice){
			var i = bases.length - 1, chain = [], base, f, around = advice == "around";
			for(; base = bases[i]; --i){
				// next line contains 5 intentional assignments
				if((f = base._meta) ? (f = f.ownProps).hasOwnProperty(name) && (isSuper(f = f[name]) ? (around ? f.spr.around : (f = f.spr[advice])) : around) : around && (f = name == cname ? base : base[pname][name]) && f !== empty[name]){
					f.ctr = base;
					chain.push(f);
				}
			}
			return chain;
		},
		_stubChain: function(chain){ // this is "after" chain
			var l = chain.length, f;
			return !l ? 0 : l == 1 ?
				(f = chain[0], function(){
					f.apply(this, arguments);
				}) :
				function(){
					for(var i = 0; i < l; ++i){
						chain[i].apply(this, arguments);
					}
				};
		},
		_stubSuper: function(chain, name){
			var i = 0, f, p = empty[name];
			for(; f = chain[i]; ++i){
				p = isSuper(f) ? (chain[i] = dcl._instantiate(f, p, name)) : f;
			}
			return name != cname ? p : function(){ p.apply(this, arguments); };
		},
		_stubChainSuper: function(chain, stub, name){
			var i = 0, f, diff, pi = 0;
			for(; f = chain[i]; ++i){
				if(isSuper(f)){
					diff = i - pi;
					chain[i] = dcl._instantiate(f, !diff ? 0 : diff == 1 ? chain[pi] : stub(chain.slice(pi, i)), name);
					pi = i;
				}
			}
			diff = i - pi;
			return !diff ? 0 : diff == 1 && name != cname ? chain[pi] : stub(pi ? chain.slice(pi) : chain);
		},
		_stub: /*generic stub*/ function(id, bases, name, chains){
			var f = chains[name] = dcl._extractChain(bases, name, "around");
			return (id ? dcl._stubChainSuper(f, dcl._stubChain, name) : dcl._stubSuper(f, name)) || function(){};
		}
	});

	function buildStubs(meta, proto){
		var weaver = meta.weaver, bases = meta.bases, chains = meta.chains;
		allKeys(weaver).forEach(function(name){
			proto[name] = dcl._stub(weaver[name], bases, name, chains);
		});
	}

	return dcl;
});
