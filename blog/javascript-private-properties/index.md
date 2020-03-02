Historically JavaScript didn't have the concept of private properties. Technically, it still doesn't - until a couple of proposals are finalized and incorporated into an edition of the standard, which looks very likely to happen this year, with ES2020. In the first part of this article, we'll examine a few ways in which private properties can be improvised in the absence of language-level support, and in the second part we take a look at said proposals.

As an example, we'll implement a class with a private property, `x`, and a public one, `y`. In addition, we'll implement a private method, creatively named `privateMethod()`, and a public one, `publicMethod()`. We'll be assuming an ES6 environment and will be using mainly ES6 `class`, but will also consider "prototypal" classes.

## Part Ⅰ - Improvised Privacy

### Pretend Privacy

One of the most common methods of creating "private" properties (whether on plain objects or classes) is by relying on the convention of prefixing such variables with an underscore. They aren't actually private; the underscore prefix is just the authors way of politely requesting for them to be _treated_ as such.

```js
class Foo {
    constructor() {
        this._x = 42; // "private" property
        this.y = 100; // public (standard) property
    }
    _privateMethod() {
        return this._x + this.y;
    }
    publicMethod() {
        return this._privateMethod() - this.y - this._x;
    }
}

let a = new Foo();
a._x; // => 42 - the property is not actually private
a._privateMethod(); // => 142
a.publicMethod(); // => 0
```

A similar approach is used by JavaScript engines for non-standard features, like [`__proto__`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto) - note the double underscores before and after "proto". These properties should also be considered implementation details and should not be accessed directly.

### Closures

This method isn't really applicable to either `class` or "prototypal" classes; it is an entirely different pattern - but it does have the advantage of actually making properties invisible from "outside". The core idea is very simple - just enclose all private members in a closure, and set the public ones for each instance, as properties of `this`.

One disadvantage of this approach is that the members (properties or methods) are not set on the function's `prototype` property and patterns that rely on that will not work - for example, using [`Object.create()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create) to create "instances". We _could_ add public methods to the prototype, but they would not have access to private members. Also, we need to account for the fact that when functions are invoked without a context object (as `f()`, instead of `context.f()`), `this` will reference the global object. So we use [`apply()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) to explicitly mention which object is to be used as `this`. More on [`this` in YDKJS](https://github.com/getify/You-Dont-Know-JS/blob/2nd-ed/objects-classes/ch2.md).

Another disadvantage is the higher memory consumption - we create a separate function object for every private method of every instance. These would still be garbage collected along with the instance object, so it's not an issue if the instances are short-lived or not created in large quantities. When using "standard" approaches (`class` or prototypal classes) each method is still a separate object, but the methods are created once and set on the classes `prototype` object - which is _shared_ between all instances.

```js
function Foo() {
    let x = 42; // "private" property
    this.y = 100; // public (standard) property
    let privateMethod = function() {
        return x + this.y;
    }
    this.publicMethod = function() {
        return privateMethod.apply(this) - this.y - x;
    }
}

let a = new Foo();
a.x; // => undefined
a.y; // => 100
a.publicMethod();
a.privateMethod(); // = > 💥 `TypeError` exception
```

You might wonder why the different behaviour when trying to access a "private" property versus a method; the former returns `undefined`, the latter throws an exception. When you try to access a non-existing property on an object, you get back `undefined`, which we can clearly see in the first case but it also happens in the second case; `a.privateMethod` (note the absence of the parentheses) is also `undefined`. The exception is thrown because the `undefined` value cannot be invoked as a function, which is what `()` does.

A variation of this approach is to return an explicitly created object:

```js
function Foo() {
    let x = 42; // "private" property
    this.y = 100; // public (standard) property
    let that = this; // capture instance reference
    let privateMethod = function() {
        return x + that.y;
    }
    return {
        publicMethod: function() {
            return privateMethod() - that.y - x;
        }
    }
}
```

This is essentially the ["module pattern"](https://scotch.io/bar-talk/4-javascript-design-patterns-you-should-know) from days of yore - without the IIFE wrapper (if we were using function declarations for the private methods - as opposed to function expressions - the wrapper would still be required to prevent functions from "leaking" outside). We also need to capture the value of `this` because inside `publicMethod()` `this` will be a reference to the returned "module" object, not the instance. This approach is fairly complicated and it also "breaks" the `instanceof` operator - avoid.

### WeakMap

This approach relies on using ES6-introduced [`WeakMap`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)s. A `WeakMap` is essentially a special kind of `Map` - which, in turn, is just a convenient and safe way of creating hash maps/tables. `WeakMap` has a couple of interesting properties; one is that _only_ objects can be used as keys - if you try to use a string or any other primitive, an exception will be thrown. Note that we're talking strictly about the _keys_; values can be anything.

Now, consider that JavaScript is a garbage-collected language; as long as there is an accessible reference to an object, the object won't be deleted. An object being referenced by a key in a `Map` will prevent the object from being garbage-collected until the `Map` instance itself is garbage-collected. With `WeakMap`, if the only reference to an object is via a `WeakMap` key, then the object is considered eligible for garbage-collection.

The main idea behind this pattern is to make use of the fact that every time a constructor is invoked, the `this` keyword is a reference to the object being constructed. A new object is created on each invocation, so these references are unique. This allows us to store data associated with each created object in a key-value hash, like `Map` or `WeakMap`, using `this` as the key and data as the value.

The "data" corresponding to each instance, in this case, is composed of the instances private properties; the public ones we create as usual. In the example below, we're using a plain object to hold all the private properties for one particular instance. Because the value of `this` is available inside public instance methods, we can use it as a key to retrieve the current instances private properties - and this cannot be done from "outside", therefore keeping them private. The created instances can eventually go out of scope and be garbage-collected; when this happens, we want to make sure that the object used to hold the particular instances private properties is also garbage collected - and that's why we use a `WeakMap` instead of `Map`.


```js
window.privateProps = new WeakMap();

class Foo {
    constructor() {
        this.y = 100; // public (standard) property
        privateProps.set(this, {
            x: 42,
            privateMethod: () => {
                const { x } = privateProps.get(this);
                return x + this.y;
            }
        });
    }
    publicMethod() {
        const { x, privateMethod } = privateProps.get(this);
        return privateMethod() - this.y - x;
    }
}

let a = new Foo();
a.x; // => undefined
a.y; // => 100
a.publicMethod(); // => 0
```

This pattern can be tweaked in many ways; for example, by adding an IIFE to enclose a dedicated `privateProps` for each class, as described [here](https://stackoverflow.com/a/33533611/447661) or by creating a `WeakMap` for every private property, as done by `babel` polyfills. We're using a global for simplicity.

### Symbols

This approach applies equally to ES6 `class` and prototypal classes, and is to some extent an improvement over the underscore-prefix technique ("Pretend Privacy"), because properties and methods are not really private - just a bit more difficult to access unintentionally. The idea is that instead of using underscores to prefix private properties, we use [symbols](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol).

```js
class Foo {
    constructor() {
        this[Foo.xKey] = 42;
        this.y = 100; // public (standard) property
        this[Foo.privateMethodKey] = function() {
            return this[Foo.xKey] + this.y;
        }
    }
    publicMethod() {
        return this[Foo.privateMethodKey]() - this[Foo.xKey] - this.y;
    }
}
Foo.xKey = Symbol();
Foo.privateMethodKey = Symbol();

let a = new Foo();
a.x; // => undefined
a.y; // => 100
a.publicMethod(); // => 0
```

Instead of using the class itself as a namespace (or setting the symbols as static properties), and option is to use an IIFE for the keys:

```js
let Foo = (function() {
    let xKey = Symbol();
    let privateMethodKey = Symbol();
    return class Foo {
        constructor() {
            this[xKey] = 42;
            this.y = 100;
            this[privateMethodKey] = function() {
                return this[xKey] + this.y;
            }
        }
        publicMethod() {
            return this[privateMethodKey]() - this[xKey] - this.y;
        }
    }
})();
```


In both variants, the hidden properties can be revealed by using [`Object.getOwnPropertySymbols()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols)  on any instance, and using the retrieved symbols to access the properties/methods; similarly, they are also included in the output of [`Object.getOwnPropertyDescriptors()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptors). However, an advantage of this approach is that even though the "private" properties are [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties), the [`for..in` loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in), commonly used to iterate over the properties of an object, will not to include properties keyed on symbols. Similarly, they will not be included in `Object.getOwnPropertyNames()`.

```js
const symbols = Object.getOwnPropertySymbols(a);
a[symbols[0]]; // => 42 - access "private" property
a[symbols[1]](); // => 142 - invoke "private" method
for (let prop in a) { console.log(prop); } // only "y" will be logged
Object.getOwnPropertyNames(a); // => ["y"] - only "public" properties are included
```

### Not an Option: Proxies

A [proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) might seem like a good fit, as this mechanism can be used to configure access to an objects properties with a great deal of granularity - however, "privatizing" instance properties wouldn't really work because the properties would be inaccessible not only from "outside", but also from class methods.

```js
class Foo {
    constructor() {
        this.x = 42; // "private" property
        this.y = 100; // public (standard) property
        return new Proxy(this, { // return a Proxy wrapper around the instance
            get: function(obj, key) { // when accessing a property on the instance...
                if (key === 'x') { // if it's one of the private properties...
                    // exhibit the same behaviour as for properties that don't
                    // exist - return "undefined"
                    return undefined;
                } else {
                    return obj[key];
                }
            }
        })
    }
    publicMethod() {
        return this.x;
    }
}

let a = new Foo();
a.x; // => undefined
a.y; // => 100
a.publicMethod(); // => undefined
```

## Part Ⅱ - Language-level Privacy

### Class Fields

The [class fields proposal](https://github.com/tc39/proposal-class-fields) ([Stage 3](https://tc39.es/process-document/) as of Feb 2020) includes provisions for private properties - but not for private _methods_. When using the syntax in this proposal, simply initializing private properties in the constructor is not sufficient - we need to use the "class field declaration" syntax to _declare_ them. Public properties can also be _declared_, but it is not required. This proposal is currently implemented and enabled by default in Chrome, Firefox and Node - but not in IE, Edge or Safari.

```js
class Foo {
    #x; // declare a private field
    constructor() {
        this.#x = 42;
        this.y = 100;
    }
    publicMethod() {
        return this.#x - this.y;
    }
}

let a = new Foo();
a.y; // => 100
a.publicMethod(); // => -58
// a.#x; // => 💥 SyntaxError: Private field '#x' must be declared in an enclosing class
```

Field declarations can also be used to _initialize_ the declared properties, which in many cases means there is no need for a `constructor`:

```js
class Foo {
    #x = 42;
    y = 100;
    publicMethod() {
        return this.#x - this.y;
    }
}
```

### Private Methods

The ["private methods"](https://github.com/tc39/proposal-private-methods) proposal is extremely simple as far as usage is concerned; it allows prefixing methods with `#` to make them private, in a similar manner to private properties:

```js
class Foo {
    #x = 42;
    y = 100;
    #privateMethod() {
        return this.#x + this.y;
    }
    publicMethod() {
        return this.#privateMethod() - this.#x - this.y;
    }
}
let a = new Foo();
// a.#x; // => 💥 SyntaxError: Private field '#x' must be declared in an enclosing class
a.y; // => 100
a.publicMethod(); // => 0
// a.#privateMethod(); // 💥 SyntaxError: Private field '#privateMethod' must be declared in an enclosing class
```

While usage is simple, there are subtle semantics to be considered when interacting with other aspects of the language; the proposal contains [more details](https://github.com/tc39/proposal-private-methods#relationship-to-other-proposals). This proposal has been in Stage 3 since 2017, but it looks like things have settled now and it will be included in ES2020. However, unlike "Class Fields", this proposal has much more limited browser support. Among major browser engines, it is only supported in V8 behind a flag.

To see it action in Chrome, enable the flag at [chrome://flags/#enable-javascript-harmony](chrome://flags/#enable-javascript-harmony) and restart the browser - and the snipped above should work. For Node.js, it needs to run with the `--harmony-private-methods` flag, but you will also need to add some logging to get output - otherwise it will just complete silently:

```
$ node.js --harmony-private-methods private-methods.js
```

Of course, for production use there is a [babel plugin](https://babeljs.io/docs/en/babel-plugin-proposal-private-methods) so you can start using this syntax right away although I would suggest reading the [implementation notes](https://babeljs.io/docs/en/babel-plugin-proposal-private-methods#loose) carefully. To summarize, if transpiled with the `loose` option being set to `true`, the private properties will actually be available as own properties on the instances - which may or may not be desirable. With `loose` being `false` (the default value for this option), a method similar to the one discussed in the "WeakMap" section will be used (with a [`WeakSet`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakSet) instead of `WeakMap`) which results in methods actually being private, but at the cost of higher memory consumption and a slight performance hit.

## Summary

Native language support for private properties is widespread, but not for private methods. Polyfills can be used to add support for both, and with nearing standardization, using language-level privacy features (in conjunction with the appropriate polyfills) does look like the optimal choice when "strong" privacy is desired. The impact on performance and memory consumption should be measured, as it can be significant.

Implementing approaches like `WeakMaps` or closures "by hand" generally doesn't make a lot of sense because of the added noise and complexity - using the native syntax is preferable, and letting the polyfills handle the implementation details.

When "strong" privacy is not a requirement, it is perfectly reasonable to employ one of the "weak" privacy approaches - like prefixing private members with underscores, or storing them on `Symbol` keys.