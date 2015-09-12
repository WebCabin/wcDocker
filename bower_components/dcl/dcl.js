(function(factory){
	if(typeof define != "undefined"){
		define(["./mini"], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory(require("./mini"));
	}else{
		dcl = factory(dcl);
	}
})(function(dcl){
	"use strict";

	function nop(){}

	var Advice = dcl(dcl.Super, {
		//declaredClass: "dcl.Advice",
		constructor: function(){
			this.before = this.around.before;
			this.after  = this.around.after;
			this.around = this.around.around;
		}
	});
	function advise(advice){ return dcl._makeSuper(advice, Advice); }

	function makeAOPStub(before, after, around){
		var beforeChain = before || nop,
			afterChain  = after  || nop,
			aroundChain = around || nop,
			stub = function(){
				var r, thrown;
				// running the before chain
				beforeChain.apply(this, arguments);
				// running the around chain
				try{
					r = aroundChain.apply(this, arguments);
				}catch(e){
					r = e;
					thrown = true;
				}
				// running the after chain
				afterChain.call(this, arguments, r);
				if(thrown){
					throw r;
				}
				return r;
			};
		stub.advices = {before: before, after: after, around: around};
		return stub;
	}

	function chain(id){
		return function(ctor, name){
			var meta = ctor._meta, rule;
			if(meta){
				rule = +meta.weaver[name] || 0;
				if(rule && rule != id){
					dcl._error("set chaining", name, ctor, id, rule);
				}
				meta.weaver[name] = id;
			}
		};
	}

	dcl.mix(dcl, {
		// public API
		Advice: Advice,
		advise: advise,
		// expose helper methods
		before: function(f){ return dcl.advise({before: f}); },
		after:  function(f){ return dcl.advise({after:  f}); },
		around: dcl.superCall,
		// chains
		chainBefore: chain(1),
		chainAfter:  chain(2),
		isInstanceOf: function(o, ctor){
			if(o instanceof ctor){
				return true;
			}
			var t = o.constructor._meta, i;
			if(t){
				for(t = t.bases, i = t.length - 1; i >= 0; --i){
					if(t[i] === ctor){
						return true;
					}
				}
			}
			return false;
		},
		// protected API starts with _ (don't use it!)
		_stub: /*generic stub*/ function(id, bases, name, chains){
			var f = chains[name] = dcl._extractChain(bases, name, "around"),
				b = dcl._extractChain(bases, name, "before").reverse(),
				a = dcl._extractChain(bases, name, "after");
			f = id ? dcl._stubChainSuper(f, id == 1 ? function(f){ return dcl._stubChain(f.reverse()); } : dcl._stubChain, name) : dcl._stubSuper(f, name);
			return !b.length && !a.length ? f || function(){} : makeAOPStub(dcl._stubChain(b), dcl._stubChain(a), f);
		}
	});

	return dcl;
});
