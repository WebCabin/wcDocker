(function(factory){
	if(typeof define != "undefined"){
		define(["./mini", "./advise"], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory(require("./mini"), require("./advise"));
	}else{
		dclDebug = factory(dcl, advise);
	}
})(function(dcl, advise){
	function DclError(message){
		if(Error.captureStackTrace){
			Error.captureStackTrace(this, DclError);
		}
		var e = Error.call(this, message), name;
		dcl.allKeys(e).forEach(function(name){
			if(e.hasOwnProperty(name)){
				this[name] = e[name];
			}
		});
		this.message = message;
	}
	DclError.prototype = dcl.delegate(Error.prototype);
	DclError.prototype.constructor = DclError;

	var CycleError = dcl(DclError, {declaredClass: "dcl/debug/CycleError"}),
		ChainingError = dcl(DclError, {declaredClass: "dcl/debug/ChainingError"}),
		SetChainingError = dcl(DclError, {declaredClass: "dcl/debug/SetChainingError"}),
		SuperCallError = dcl(DclError, {declaredClass: "dcl/debug/SuperCallError"}),
		SuperError = dcl(DclError, {declaredClass: "dcl/debug/SuperError"}),
		SuperResultError = dcl(DclError, {declaredClass: "dcl/debug/SuperResultError"});

	var chainNames = ["UNCHAINED BUT CONTAINS ADVICE(S)", "CHAINED BEFORE", "CHAINED AFTER",
			"ERRONEOUSLY CHAINED BEFORE AND AFTER"];
	function chainName(id){
		return id >= 0 && id <= 3 ? chainNames[id] : "UNKNOWN (" + id + ")";
	}

	var noDecls = " (specify 'declaredClass' string in your classes to get better diagnostics)";
	advise.around(dcl, "_error", function(/*sup*/){
		return function(reason, a1, a2, a3, a4, a5){
			var cName, someUnknown, i, base, name, names = [], c = {};
			switch(reason){
				case "cycle":
					cName = a1.hasOwnProperty("declaredClass") && a1.declaredClass;
					someUnknown = !cName;
					for(i = a2.length - 1; i >= 0; --i){
						base = a2[i][0];
						name = base.prototype.hasOwnProperty("declaredClass") && base.prototype.declaredClass;
						if(!name){
							name = "UNNAMED_" + base._uniqueId;
							someUnknown = true;
						}
						if(!c[name]){
							names.push(name);
							c[name] = 1;
						}
					}
					throw new CycleError("dcl: base class cycle found in: " + (cName || "UNNAMED") +
						" - bases: " + names.join(", ") + " are mutually dependent" +
						(someUnknown ? noDecls : ""));
				case "chain":
					cName = a2.prototype.hasOwnProperty("declaredClass") && a2.prototype.declaredClass;
					name = a4.prototype.hasOwnProperty("declaredClass") && a4.prototype.declaredClass;
					someUnknown = !(cName && name);
					throw new ChainingError("dcl: conflicting chain directives from bases found in: " + (cName || ("UNNAMED_" + a2._uniqueId)) +
						", method: " + a1 + " - it was " + chainName(a3) + " yet " +
						(name || ("UNNAMED_" + a4._uniqueId)) + " sets it to " + chainName(a5) +
						(someUnknown ? noDecls : ""));
				case "set chaining":
					cName = a2.prototype.hasOwnProperty("declaredClass") && a2.prototype.declaredClass;
					someUnknown = !cName;
					throw new SetChainingError("dcl: attempt to set conflicting chain directives in: " + (cName || ("UNNAMED_" + a2._uniqueId)) +
						", method: " + a1 + " - it was " + chainName(a4) + " yet being changed to " + chainName(a3) +
						(someUnknown ? noDecls : ""));
				case "wrong super call":
					cName = a1.prototype.hasOwnProperty("declaredClass") && a1.prototype.declaredClass;
					someUnknown = !cName;
					throw new SuperCallError("dcl: argument of around advice or supercall decorator should be a function in: " +
						(cName || ("UNNAMED_" + a1._uniqueId)) + ", method: " + a2 + (someUnknown ? noDecls : ""));
				case "wrong super":
					cName = a1.prototype.hasOwnProperty("declaredClass") && a1.prototype.declaredClass;
					someUnknown = !cName;
					throw new SuperError("dcl: super method should be a function in: " +
						(cName || ("UNNAMED_" + a1._uniqueId)) + ", method: " + a2 + (someUnknown ? noDecls : ""));
				case "wrong super result":
					cName = a1.prototype.hasOwnProperty("declaredClass") && a1.prototype.declaredClass;
					someUnknown = !cName;
					throw new SuperResultError("dcl: around advice or supercall should return a function in: " +
						(cName || ("UNNAMED_" + a1._uniqueId)) + ", method: " + a2 + (someUnknown ? noDecls : ""));
			}
			throw new DclError("dcl: " + reason);
		};
	});

	advise.after(dcl, "_postprocess", function(args, ctor){
		// validate that chaining is consistent
		var meta = ctor._meta, weaver = meta.weaver, bases = meta.bases,
			name, chain, base, i, rule;
		dcl.allKeys(weaver).forEach(function(name){
			chain = (+weaver[name] || 0);
			for(i = bases.length - 1; i >= 0; --i){
				base = bases[i];
				meta = base._meta;
				if(meta){
					rule = (+meta.weaver[name] || 0);
					if(chain != rule && (!chain || rule)){
						dcl._error("chain", name, ctor, chain, base, rule);
					}
				}
			}
		});
	});

	advise.around(dcl, "_instantiate", function(/*sup*/){
		return function(advice, previous, node){
			if(!advice || !advice.spr || typeof advice.spr.around != "function"){
				dcl._error("wrong super call", advice.ctr, node);
			}
			if(previous && typeof previous != "function"){
				dcl._error("wrong super", advice.ctr, node);
			}
			var t = advice.spr.around(previous);
			if(typeof t != "function"){
				dcl._error("wrong super result", advice.ctr, node);
			}
			t.ctr = advice.ctr;
			return t;
		};
	});

	advise(advise, "_instantiate", {
		before: function(advice, previous, node){
			if(typeof advice != "function"){
				dcl._error("wrong super call", node.instance.constructor, node.name);
			}
			if(previous && typeof previous != "function"){
				dcl._error("wrong super", node.instance.constructor, node.name);
			}
		},
		after: function(a, result){
			if(typeof result != "function"){
				dcl._error("wrong super result", a[2].instance.constructor, a[2].name);
			}
		}
	});

	function logCtor(ctor){
		var meta = ctor._meta;
		if(!meta){
			console.log("*** class does not have meta information compatible with dcl");
			return;
		}
		var weaver = meta.weaver, bases = meta.bases, chains = meta.chains, names = [], base, name, someUnknown, i;
		for(i = 0; i < bases.length; ++i){
			base = bases[i];
			name = base.prototype.hasOwnProperty("declaredClass") && base.prototype.declaredClass;
			if(!name){
				name = "UNNAMED_" + (base.hasOwnProperty("_uniqueId") ? base._uniqueId : "");
				someUnknown = true;
			}
			names.push(name);
		}
		console.log("*** class " + names[0] + " depends on " + (names.length - 1) + " classes");
		if(names.length > 1){
			console.log("    dependencies: " + names.slice(1).join(", "));
		}
		if(someUnknown){
			console.log("    " + noDecls);
		}
		dcl.allKeys(weaver).forEach(function(name){
			i = +weaver[name];
			if(!isNaN(i)){
				var hasStub = typeof ctor.prototype[name].advices == "object";
				if(hasStub){
					var b = dcl._extractChain(bases, name, "b").length,
						f = dcl._extractChain(bases, name, "f").length,
						a = dcl._extractChain(bases, name, "a").length;
				}
				console.log("    class method " + name + " is " + chainName(i) +
					(hasStub ?
						", and has an AOP stub (before: " + b + ", around: " + f + ", after: " + a + ")" :
						" (length: " + chains[name].length + ")" ));
			}
		});
	}

	function countAdvices(node, chain){
		for(var counter = 0, p = node[chain]; p != node; p = p[chain], ++counter);
		return counter;
	}

	function log(o, suppressCtor){
		switch(typeof o){
			case "function":
				logCtor(o);
				return;
			case "object":
				var base = o.constructor,
					name = base.prototype.hasOwnProperty("declaredClass") && base.prototype.declaredClass;
				if(!name){
					name = "UNNAMED_" + (base.hasOwnProperty("_uniqueId") ? base._uniqueId : "");
				}
				console.log("*** object of class " + name);
				// log the constructor
				if(!suppressCtor){
					logCtor(base);
				}
				// log methods
				dcl.allKeys(o).forEach(function(name){
					var f = o[name], b, r, a;
					if(typeof f == "function"){
						if(f.adviceNode && f.adviceNode instanceof advise.Node){
							b = countAdvices(f.adviceNode, "pb");
							r = countAdvices(f.adviceNode, "pf");
							a = countAdvices(f.adviceNode, "pa");
							console.log("    object method " + name + " has an AOP stub (before: " +
								b + ", around: " + r + ", after: " + a + ")");
						}
					}
				});
				return;
		}
		console.log(o);
	}

	return {
		log: log,
		DclError: DclError,
		CycleError: CycleError,
		ChainingError: ChainingError,
		SetChainingError: SetChainingError,
		SuperCallError: SuperCallError,
		SuperError: SuperError,
		SuperResultError: SuperResultError
	};
});
