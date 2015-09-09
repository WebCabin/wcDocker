# DCL

[![Build status][travis-image]][travis-url]
[![Dependencies][deps-image]][deps-url]
[![devDependencies][dev-deps-image]][dev-deps-url]
[![NPM version][npm-image]][npm-url]


A minimalistic yet complete JavaScript package for [node.js](http://nodejs.org)
and modern browsers that implements OOP with mixins + AOP at both "class" and
object level. Implements [C3 MRO](http://www.python.org/download/releases/2.3/mro/)
to support a Python-like multiple inheritance, efficient supercalls, chaining,
full set of advices, and provides some useful generic building blocks. The whole
package comes with an extensive test set, and it is fully compatible with the strict mode.

The package was written with debuggability of your code in mind. It comes with
a special debug module that explains mistakes, verifies created objects, and helps
to keep track of AOP advices. Because the package uses direct static calls to super
methods, you don't need to step over unnecessary stubs. In places where stubs are
unavoidable (chains or advices) they are small, and intuitive.

If you migrate your code from a legacy framework that implements dynamic (rather
than static) supercalls, take a look at the module "inherited" that dispatches
supercalls dynamically trading off the simplicity of the code for some run-time
CPU use, and a little bit less convenient debugging of such calls due to an extra
stub between your methods.

The main hub of everything `dcl`-related is [dcljs.org](http://www.dcljs.org/),
which hosts [extensive documentation](http://www.dcljs.org/docs/).

## How to install

If you plan to use it in your [node.js](http://nodejs.org) project, install it
like this:

```
npm install dcl
```

For your browser-based projects I suggest to use [volo.js](http://volojs.org):

```
volo install uhop/dcl
```

## How to use

```js
// if you run node.js, or CommonJS-compliant system
var dcl = require("dcl");

// if you use dcl in a browser with AMD (like RequireJS):
require(["dcl"], function(dcl){
    // the same code that uses dcl
});

// or when you define your own module:
define(["dcl"], function(dcl){
	// your dcl-using code goes here
});
```

### Inheritance, constructors, super calls

Let's continue with our coding example:

```js
// declare a class derived from Object:
var Person = dcl(null, {
	// (optional, but recommended) name your class:
	declaredClass: "Person",
    // let's specify a default name as a class-level constant
    name: "Anonymous",
    // constructor is a method named ... 'constructor'
    constructor: function(name){
        if(name){
            this.name = name;
        }
        console.log("Person " + this.name + " is constructed");
    }
});

// we can derive more classes from it using single inheritance
var Bureaucrat = dcl(Person, {
	declaredClass: "Bureaucrat",
    constructor: function(name){
        console.log("Bureaucrat " + this.name + " is constructed");
    },
    approve: function(document){
        // NEVER!
        console.log("Rejected by " + this.name);
        return false;
    }
});

var clerk = new Bureaucrat();
// Person Anonymous is constructed
// Bureaucrat Anonymous is constructed
clerk.approve(123);
// Rejected by Anonymous
```

As you can see it is trivial to define "classes" and derive them using
single inheritance. Constructors are automatically chained and called from
the farthest to the closest with the same arguments. Our Bureaucrat constructor
ignores name, because it knows that Person will take care of it.

Now let's do a mixin.

```js
// let's declare one more class that will be used as a mixin
// any normal class would do
var Speaker = dcl(null, {
    speak: function(msg){
        // a method --- just a simple function
        console.log(this.name + ": " + msg);
    }
});

// now we are ready to create Talker from Person + Speaker
var Talker = dcl([Person, Speaker], {
    // no own methods for simplicity
});

var alice = new Talker("Alice");
// Person Alice is constructed
alice.speak("hello!");
// Alice: hello!
```

Now let's call a method of our super class.

```js
// let's declare another mixin, this time using a super call
var Shouter = dcl(Speaker, {
    speak: dcl.superCall(function(sup){
        // we use the double function technique to inject
        // "sup" --- a method from a super class
        return function(msg){
            if(sup){
                // theoretically it is possible that
                // there is no super method --- we can be last in line;
                // not in this case, though --- we are based
                // on Speaker meaning it will be always pulled in
                sup.call(this, msg.toUpperCase());
            }
        };
    })
});

var Sarge = dcl([Talker, Shouter], {
    // no own methods for simplicity
});

var bob = new Sarge("Bob");
// Person Bob is constructed
bob.speak("give me twenty!");
// Bob: GIVE ME TWENTY!
```

The double function technique for a super call allows you to work directly with
a next method in chain --- no intermediaries means that this call is as fast as
it can be, no run-time penalties are involved during method calls, and it greatly
simplifies debugging.

And, of course, our "classes" can be absolutely anonymous, like in this one-off "class":

```js
var loudBob = new (dcl([Talker, Shouter], {}))("Loud Bob");
// Person Loud Bob is constructed
loudBob.speak("Anybody home?");
// Loud Bob: ANYBODY HOME?
```

### AOP

We can use aspect-oriented advices to create our "classes":

```js
// one more mixin
var Sick = dcl(Person, {
    speak: dcl.advise({
        before: function(msg){
            console.log(this.name + ": *hiccup* *hiccup* *hiccup*");
        },
        after: function(args, result){
            console.log(this.name + ": *sniffle* I am so-o-o sick!");
        }
    })
});

var SickTalker = dcl([Talker, Sick], {
    // no own methods for simplicity
});

var clara = new SickTalker("Clara");
// Person Clara is constructed
clara.speak("I want a glass of water!");
// Clara: *hiccup* *hiccup* *hiccup*
// Clara: I want a glass of water!
// Clara: *sniffle* I am so-o-o sick!
```

Hmm, both `Talker` and `Sick` require the same "class" `Person`. How is it going
to work? Don't worry, all duplicates are going to be eliminated by the underlying
[C3 MRO](http://www.python.org/download/releases/2.3/mro/) algorithm. Read all
about it in [the documentation](http://dcljs.org/docs/).

Of course we can use an "around" advice as well, and it will behave just like
a super call above. It will require the same double function technique to inject
a method from a super class.

```js
// One more mixin
var Martian = dcl(Speaker, {
    speak: dcl.around(function(sup){
        return function(msg){
            if(sup){
                sup.call(this, "beep-beep-beep");
            }
        };
    })
});

// now we are ready for...
var SickMartianSarge = dcl([Sarge, Sick, Martian], {
    // no own methods for simplicity
});

var don = new SickMartianSarge("Don");
// Person Don is constructed
don.speak("Doctor? Nurse? Anybody?");
// Don: *hiccup* *hiccup* *hiccup*
// Don: BEEP-BEEP-BEEP
// Don: *sniffle* I am so-o-o sick!
```

For convenience, `dcl` provides shortcuts for singular advices:

```
// pseudo code
dcl.before(f) == dcl.advise({before: f})
dcl.around(f) == dcl.advise({around: f})
dcl.after (f) == dcl.advise({after:  f})
```

### Chaining

While constructors are chained by default you can chain any methods you like.
Usually it works well for lifecycle methods, and event-like methods.

```js
// waker-upper and sleeper
var BioOrganism = dcl(null, {
    // no methods for simplicity
});
dcl.chainAfter(BioOrganism, "wakeUp");
dcl.chainBefore(BioOrganism, "sleep");
// now wakeUp() and sleep() are automatically chained

// our mixins
var SwitchOperator = dcl(null, {
    wakeUp: function(){ console.log("turn on lights"); },
    sleep:  function(){ console.log("turn off lights"); }
});
var TeethBrusher = dcl(null, {
    wakeUp: function(){ console.log("brush my teeth"); },
    sleep:  function(){ console.log("brush my teeth again"); }
});
var SmartDresser = dcl(null, {
    wakeUp: function(){ console.log("dress up for work"); },
    sleep:  function(){ console.log("switch to pajamas"); }
});

// all together now
var OfficeWorker = dcl([BioOrganism, SwitchOperator, TeethBrusher, SmartDresser], {
    // no methods for simplicity
});
var ethel = OfficeWorker();
ethel.wakeUp();
// turn on lights
// brush my teeth
// dress up for work
ethel.sleep();
// switch to pajamas
// brush my teeth again
// turn off lights
```

### Advising objects

While class-level AOP is static, we can always advise any method dynamically,
and unadvise it at will:

```js
// let's implement previous example with object-level AOP

// for that we need to use a new module:
var advise = require("dcl/advise");

// let's use one-off class
var ethel = new (dcl(null, {
    wakeUp: function(){ /* nothing */ },
    sleep:  function(){ /* nothing */ }
}))();

var wakeAd1 = advise(ethel, "wakeUp", {
    before: function(){ console.log("turn on lights"); }
});
var wakeAd2 = advise(ethel, "wakeUp", {
    before: function(){ console.log("brush my teeth"); }
});
var wakeAd3 = advise(ethel, "wakeUp", {
    before: function(){ console.log("dress up for work"); }
});

// notice that after advices attached in the reverse order
var sleepAd1 = advise(ethel, "sleep", {
    after: function(){ console.log("switch to pajamas"); }
});
var sleepAd2 = advise(ethel, "sleep", {
    after: function(){ console.log("brush my teeth again"); }
});
var sleepAd3 = advise(ethel, "sleep", {
    after: function(){ console.log("turn off lights"); }
});

ethel.wakeUp();
// turn on lights
// brush my teeth
// dress up for work
ethel.sleep();
// switch to pajamas
// brush my teeth again
// turn off lights

// let's save on electricity
wakeAd1.unadvise();
// brushing teeth more than once a day is overrated, right?
sleepAd2.unadvise();
// no need to dress up for work either --- Ethel is CEO!
wakeAd3.unadvise();

ethel.wakeUp();
// brush my teeth
ethel.sleep();
// switch to pajamas
// turn off lights
```

Again, for convenience, `dcl/advise` provides shortcuts for singular advices:

```
// pseudo code
advise.before(obj, methodName, f) == advise(obj, methodName, {before: f})
advise.around(obj, methodName, f) == advise(obj, methodName, {around: f})
advise.after (obj, methodName, f) == advise(obj, methodName, {after:  f})
```

Naturally "around" advices use the same double function technique to be super
light-weight.

### Debugging helpers

There is a special module `dcl/debug` that adds better error checking and reporting
for your "classes" and objects. All you need is to require it, and it will plug
right in:

```js
var dclDebug = require("dcl/debug");
```

In order to use it to its fullest, we should include a static class id in our
"class" definitions like so:

```js
var OurClass = dcl(null, {
    declaredClass: "OurClass",
    // ... the rest of definitions
});
```

It is strongly suggested to specify `declaredClass` for every declaration in every
real project.

This `declaredClass` can be any unique string, but by convention it should be
a human-readable name of your "class", which possibly indicate where this class can
be found. For example, if you follow the convention "one class per file it can be
something like `"myProject/aSubDir/aFileName"`. If you define several "classes"
per file you can use a following schema: `"myProject/SubDirs/FileName/ClassName"`.
Remember that this name is for you, it will be reported in error messages and logs.

Yes, logs. The debug module can log constructors and objects created by
those constructors:

```js
var A = dcl(null, {
    declaredClass: "A",
    sleep: dcl.after(function(){
        console.log("*zzzzzzzzzzzzz*");
    })
});

var B = dcl(A, {
    declaredClass: "B",
    sleep: function(){
        console.log("Time to hit the pillow!");
    }
});

var fred = new B();
advise.after(fred, "sleep", function(){
    console.log("*ZzZzZzZzZzZzZ*")
});
fred.sleep();
// Time to hit the pillow!
// *zzzzzzzzzzzzz*
// *ZzZzZzZzZzZzZ*

// now we can inspect all our objects:

dclDebug.log(A);
// *** class A depends on 0 classes
//     class method constructor is CHAINED AFTER (length: 0)
//     class method sleep is UNCHAINED BUT CONTAINS ADVICE(S),
//       and has an AOP stub (before: 0, around: 0, after: 1)

dclDebug.log(B);
// *** class B depends on 1 classes
//     dependencies: A
//     class method constructor is CHAINED AFTER (length: 0)
//     class method sleep is UNCHAINED BUT CONTAINS ADVICE(S),
//       and has an AOP stub (before: 0, around: 1, after: 1)

dclDebug.log(fred);
// *** object of class B
// *** class B depends on 1 classes
//     dependencies: A
//     class method constructor is CHAINED AFTER (length: 0)
//     class method sleep is UNCHAINED BUT CONTAINS ADVICE(S),
//       and has an AOP stub (before: 0, around: 1, after: 1)
//     object method sleep has an AOP stub (before: 0, around: 1, after: 2)
```

This way we can always know that we generated correct classes, inspect static
chaining and advices, and even can monitor dynamically attached/removed advices.

## Summary

Obviously this is a simple readme that was supposed to give an overview of `dcl`.
For more details, please read [the docs](http://www.dcljs.org/docs/).

Additionally `dcl` provides a small library of predefined
[base classes](http://www.dcljs.org/docs/bases/),
[mixins](http://www.dcljs.org/docs/mixins/),
and [useful advices](http://www.dcljs.org/docs/advices/). Check them out too.

Happy hacking!

[npm-image]:      https://img.shields.io/npm/v/dcl.svg
[npm-url]:        https://npmjs.org/package/dcl
[deps-image]:     https://img.shields.io/david/uhop/dcl.svg
[deps-url]:       https://david-dm.org/uhop/dcl
[dev-deps-image]: https://img.shields.io/david/dev/uhop/dcl.svg
[dev-deps-url]:   https://david-dm.org/uhop/dcl#info=devDependencies
[travis-image]:   https://img.shields.io/travis/uhop/dcl.svg
[travis-url]:     https://travis-ci.org/uhop/dcl
