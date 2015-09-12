(function(factory){
	if(typeof define != "undefined"){
		define(["./mini", "./advise"], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory(require("./mini"), require("./advise"));
	}else{
		factory(dcl, advise);
	}
})(function(dcl, advise){
	var empty = {}, t;

	function inherited(ctor, name, args){
		var callee = arguments.length < 3 && ctor.callee, // callee is truthy if in non-strict mode.
			f = get.call(this, callee ? callee.ctr : ctor, callee ? callee.nom : name);
		if(f){ return f.apply(this, callee ? ctor || name : args); }
		// intentionally no return
	}

	function get(ctor, name){
		var meta = this.constructor._meta, bases, base, i, l;
		if(+meta.weaver[name]){
			return; // return undefined
		}
		if(meta){
			if(meta.chains.hasOwnProperty(name)){
				if((bases = meta.chains[name])){	// intentional assignment
					for(i = bases.length - 1; i >= 0; --i){
						base = bases[i];
						if(base.ctr === ctor){
							return i > 0 ? bases[i - 1] : 0;
						}
					}
				}
				return; // return undefined
			}
			for(bases = meta.bases, i = bases.length - 1; i >= 0; --i){
				if(bases[i] === ctor){
					break;
				}
			}
			if(i >= 0){
				for(++i, l = bases.length; i < l; ++i){
					if((meta = (base = bases[i])._meta)){	// intentional assignments
						if((meta = meta.ownProps).hasOwnProperty(name)){	// intentional assignment
							return meta[name];
						}
					}else{
						return base.prototype[name];
					}
				}
			}
		}
		return empty[name];
	}

	advise.after(dcl, "_postprocess", function(args, ctor){
		// decorate all methods with necessary nom/ctr variables
		var bases = ctor._meta.bases, i = bases.length - 1, base, meta, name, f;
		for(; i >= 0; --i){
			base = bases[i];
			if((meta = base._meta)){ // intentional assignment
				meta = meta.ownProps;
				dcl.allKeys(meta).some(function(name){
					f = meta[name];
					if(typeof f == "function"){
						if(f.nom === name){ return 1; }
						f.nom = name;
						f.ctr = base;
					}
				});
			}
		}
		ctor.prototype.inherited = inherited;
		ctor.prototype.getInherited = get;
	});

	dcl.getInherited = inherited.get = get;
	return dcl.inherited = inherited;   // intentional assignment
});
