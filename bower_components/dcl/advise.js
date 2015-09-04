(function(factory){
	if(typeof define != "undefined"){
		define([], factory);
	}else if(typeof module != "undefined"){
		module.exports = factory();
	}else{
		advise = factory();
	}
})(function(){
	"use strict";

	function Node(instance, name){
		this.next_before = this.prev_before = this.next_after = this.prev_after =
			this.next_around = this.prev_around = this;
		this.instance = instance;
		this.name = name;
	}
	var p = Node.prototype = {
		add: function(before, after, around, original){
			var node = new Node(this.instance, this.name);
			node.parent = this;
			node.before = before;
			this._add("before", node);
			node.after = after;
			this._add("after", node);
			node.around = around;
			this._add("around", node, original);
			node.original = original;
			if(original){ node.around = advise._instantiate(original, node.prev_around.around, this); }
			return node;
		},
		_add: function(topic, node, flag){
			if(node[topic] || flag){
				var n = "next_" + topic, p = "prev_" + topic;
				(node[p] = this[p])[n] = (node[n] = this)[p] = node;
			}
		},
		remove: function(node){
			this._remove("before", node);
			this._remove("after",  node);
			this._remove("around", node);
		},
		_remove: function(topic, node){
			var n = "next_" + topic, p = "prev_" + topic;
			node[n][p] = node[p];
			node[p][n] = node[n];
		},
		destroy: function(){
			var around = this.prev_around.around, t = this.next_around, parent = this.parent;
			this.remove(this);
			if(t !== this){
				for(; t !== parent; around = t.around, t = t.next_around){
					if(t.original){
						t.around = advise._instantiate(t.original, around, this);
					}
				}
			}
			this.instance = 0;
		}
	};
	p.unadvise = p.destroy;   // alias

	function makeAOPStub(node){
		var f = function(){
			var p, r, t = this, a = arguments, thrown;
			// running the before chain
			for(p = node.prev_before; p !== node; p = p.prev_before){
				p.before.apply(t, a);
			}
			// running the around chain
			try{
				if(node.prev_around !== node){ r = node.prev_around.around.apply(t, a); }
			}catch(e){
				r = e;
				thrown = true;
			}
			// running the after chain
			for(p = node.next_after; p !== node; p = p.next_after){
				p.after.call(t, a, r);
			}
			if(thrown){
				throw r;
			}
			return r;
		};
		f.adviceNode = node;
		return f;
	}

	function advise(instance, name, advice){
		var f = instance[name], node;
		if(f && f.adviceNode && f.adviceNode instanceof Node){
			node = f.adviceNode;
		}else{
			node = new Node(instance, name);
			if(f && f.advices){
				f = f.advices;
				node.add(f.before, f.after, f.around);
			}else{
				node.add(0, 0, f);
			}
			instance[name] = makeAOPStub(node);
		}
		if(typeof advice == "function"){ advice = advice(name, instance); }
		return node.add(advice.before, advice.after, 0, advice.around);
	}

	advise.before = function(instance, name, f){ return advise(instance, name, {before: f}); };
	advise.after  = function(instance, name, f){ return advise(instance, name, {after:  f}); };
	advise.around = function(instance, name, f){ return advise(instance, name, {around: f}); };
	advise.Node = Node;

	advise._instantiate = function(advice, previous, node){ return advice(previous); };

	return advise;
});
