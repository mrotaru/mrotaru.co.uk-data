
---

https://html.spec.whatwg.org/multipage/window-object.html#dom-document-2

---

The global `document` is not part of the JavaScript language - instead, it is provided by Chrome because it implements the [HTML standard](https://html.spec.whatwg.org/multipage/), as browsers generally do - but other implementations might not. For example, in a server-side runtime like Node.js, there would be little use of it; instead, it provides globals that are more relevant to it's particular environment - for example, [`process`](https://nodejs.org/api/process.html#process_process), which can be used to retrieve the comm   The core language remains the same across the different environments, but its capabilities are extended via an ecosystem of built-in objects and sometimes a standard library. Even though both Chrome and Node.js embed the same JavaScript engine (V8), they are fundamentally different environments and sometimes entail specific programming patterns and conventions - like the [error-first callback style](https://fredkschott.com/post/2014/03/understanding-error-first-callbacks-in-node-js/), common in Node.js programs. 

---

The global `document` is not part of the JavaScript language - instead, it is provided by Chrome because it implements the [HTML standard](https://html.spec.whatwg.org/multipage/) - as browsers generally do. Browsers implement many other standards (generally produced by bodies like [<abbr title="Web Hypertext Application Technology Working Group">WATWG</abbr>](https://spec.whatwg.org/) and [<abbr title="World Wide Web Consortium">W3C</abbr>](https://www.w3.org/standards/webdesign/script)) - 

---

JavaScript code is normally executed by an engine that is embedded in a host environment. Combined, these two pieces form a JavaScript "runtime" or "implementation"; one category of such runtimes is composed of web browsers. Taking Google's Chrome as a concrete example - when loading a web page, Chrome will parse the HTML for [`script`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script) tags, download the referenced scripts and feed them to its embedded JavaScript engine, [V8](https://v8.dev/). Engines are responsible for parsing, compiling and executing the scripts. 

Once a script is running, it will have access to a number of built-in, globally available objects, functions and values, as [defined by the language specification](https://www.ecma-international.org/ecma-262/10.0/#sec-global-object). But scripting languages aren't very useful on their own; for example, in order to be useful as a browser scripting language, JavaScript needs a way to query and manipulate the [<abbr title="Document Object Model">DOM</abbr>](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) - so a browser host environments will supplement the specification-defined objects with _host-defined_ objects, like [`document`](https://developer.mozilla.org/en-US/docs/Web/API/Window/document). Functionality provided in this manner is independent of the language itself; standard bodies like ... produce specifications and then it is up to individual implementations to 

```js
// manipulate the current document (web page) via the DOM API
document.querySelector('html').style.backgroundColor = 'lightgray';
```

This type of environment-specific functionality is independent of the language itself. defined in standards developed independently of the language; most web standards are governed by [<abbr title="Web Hypertext Application Technology Working Group">WATWG</abbr>](https://spec.whatwg.org/), [<abbr title="World Wide Web Consortium">W3C</abbr>](https://www.w3.org/standards/webdesign/script) and [Ecma International](https://ecma-international.org/publications/standards/Stnindex.htm#Software_Engineering_and_Interfaces). Some standards (like [`console`](https://console.spec.whatwg.org/#console-namespace)) are implemented across multiple environments.

When the engine is embedded in a server-side runtime like Node.js, there is no browser that will load additional scripts or libraries - instead, the runtime provides the [`require() function`](https://nodejs.org/api/modules.html#modules_require_id) as an alternative mechanism (note that Node.js was released in 2009, and back then JavaScript did not have the [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) statement, introduced by ES2015). Much of Node.js' [built-in functionality](https://nodejs.org/api/) is provided as a standard library of loadable modules, rather than as global objects - although these [are used as well](https://nodejs.org/api/globals.html).

In both Chrome and Node.js, the core language remains the same; in fact, both embed the same engine - V8. But each environment extends the capabilities of th

The core language remains the same across the different environments, but its capabilities are extended via an ecosystem of built-in objects and sometimes a standard library. Even though both Chrome and Node.js embed the same JavaScript engine (V8), they are fundamentally different environments and sometimes entail specific programming patterns and conventions - like the [error-first callback style](https://fredkschott.com/post/2014/03/understanding-error-first-callbacks-in-node-js/), common in Node.js programs. 

---

When the engine is embedded in a server-side runtime like Node.js, there is no browser that will load additional scripts or libraries - so Node.js provides the globally available [`require() function`](https://nodejs.org/api/modules.html#modules_require_id) as an alternative mechanism (note that Node.js was released in 2009, and back then JavaScript did not have the [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) statement, introduced by ES2015). Much of Node.js' [built-in functionality](https://nodejs.org/api/) is provided as a standard library of loadable modules, rather than as methods on a global objects - although these [are used as well](https://nodejs.org/api/globals.html).

---

 , and sometimes specific programming patterns and conventions (like the [error-first callback style](https://fredkschott.com/post/2014/03/understanding-error-first-callbacks-in-node-js/), common in Node.js programs).

---

As a matter of security, the host will impose certain restrictions on the engine. For example, browsers will provide a [MediaDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) global which can be used to access the user's microphone - but before allowing the engine access to it, the host will ask for the user's permission.

---

Of course, <abbr title="Document Object Model">DOM</abbr> manipulation is of little use when the language is actually running on the server side via Node.js, being used in the same manner as PHP or Ruby; a server-side environment has different needs. It provides [a mechanism for loading JavaScript files and modules](https://nodejs.org/dist/latest-v13.x/docs/api/modules.html#modules_modules) because they can't be [loaded via HTML `<script>` tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script), as you would do in a browser; ES6 finally introduced a standard module format and the `import` statement, but Node.js has been in use for quite some years by that time. and language-level pecific functionality](https://nodejs.org/dist/latest-v13.x/docs/api/) is implemented as loadable modules, in addition to a [suite of global host objects](https://nodejs.org/api/globals.html) (like [`process`](https://nodejs.org/api/process.html)) and functions (like [`setImmediate()`](https://nodejs.org/api/globals.html#globals_setimmediate_callback_args)). Package managers like [`npm`](https://docs.npmjs.com/cli/npm) can also be used install additional packages from [npmjs](https://www.npmjs.com/). Node.js is a project governed by the [OpenJS Foundation](https://openjsf.org/projects/).

---

Over time engines have gotten very complicated, but in broad lines they employ a <abbr title="Just-in-time">JIT</abbr> strategy - compilation and execution is deferred as long as possible, while "hot paths" are actually compiled multiple times, with increasing levels of optimization. 

---
### Loading JavaScript

Historically the JavaScript language did not concern itself with loading of scripts or modules - there was no need for that because browsers were the only significant host environment, and they loaded JavaScript with `script` tags. As the language started to be used in other environments and makeshift module loading solutions proliferated, the need for a standardized method became apparent - and ES6 introduced the static `import` statement, which gained dynamic capabilities in ES2020. The transition isn't smooth because projects like h

---

Of course, <abbr title="Document Object Model">DOM</abbr> manipulation is of little use when the language is actually running on the server side via Node.js, being used in the same manner as PHP or Ruby; a server-side environment has different needs. It implements [a mechanism for loading JavaScript files and modules](https://nodejs.org/dist/latest-v13.x/docs/api/modules.html#modules_modules) because they can't be [loaded via HTML `<script>` tags](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script), as you would do in a browser. Much of the [Node-specific functionality](https://nodejs.org/dist/latest-v13.x/docs/api/) is implemented as loadable modules, in addition to a [suite of global host objects](https://nodejs.org/api/globals.html) (like [`process`](https://nodejs.org/api/process.html)) and functions (like [`setImmediate()`](https://nodejs.org/api/globals.html#globals_setimmediate_callback_args)). Package managers like [`npm`](https://docs.npmjs.com/cli/npm) can also be used install additional packages from [npmjs](https://www.npmjs.com/). Node.js is a project governed by the [OpenJS Foundation](https://openjsf.org/projects/).

---

For a few years now JavaScript has been rapidly gaining popularity, and this trend shows no sign of abating. In addition to client-side web app development, it is now used for creating [desktop](https://electronjs.org/) and [mobile](https://facebook.github.io/react-native/) apps, as a [server-side language](https://nodejs.org/en/) and even [embedded](https://www.espruino.com/). This ubiquity means an influx of new developers, many of which already have a "main" language, like Java, C++ or PHP - in these, and many other popular programming languages, code is mostly organized as classes and while JavaScript also supports the class-based object-oriented paradigm, it can leave one with a kind of "uncanny valley" feeling because even though things look very similar on the surface, JavaScript classes are just different in ways that can be difficult to truly grok without digging deeper.

---

Objects are the "bread and butter" of most JavaScript programs. They can be created in a number of ways; in the snippet below we're using the "object initializer" syntax. Objects created this way are commonly referred to as "literal" or "plain" objects, or even <abbr title="Plain Old JavaScript Object">POJO</abbr>s. JavaScript objects don't have to have a stable structure - properties can be added and removed at runtime.

Other kinds include _instance_ objects (created by a constructor) and _function_ objects - more on these later. The special `undefined` value is given as the value of properties that cannot be found; this will also be discussed in detail in later sections.

---

It is often useful to manipulate values indirectly; for example, let's say you have a large data structure - an object with hundreds of properties. And you have a function that needs to perform some sort of calculation based on this object. One option is for you _clone_ the object and give the function a complete _copy_ - but cloning and moving objects around in memory is an expensive operation. It would be much more efficient to give the function a _reference_ to the object, wouldn't it ?

---

For a few years now JavaScript has been rapidly gaining popularity, and this trend shows no sign of abating. In addition to web development, it is now used for creating [desktop applications](https://electronjs.org/) and also runs on the server via [Node.js](https://nodejs.org/en/). This ubiquity means an influx of new developers, many of which already have a "main" language, like Java, C++ or PHP. 

One way, perhaps the best way for learning JavaScript, is to read Kyle Simpson's ["You Don't Know JS" series of books](https://www.amazon.com/gp/product/B07FK9VBD7); prototypes are explained very well in one of the books, ["this & Object Prototypes"](https://www.amazon.com/gp/product/B00LPUIB9G) but to make sense of it you'd better have some JS background already, perhaps by reading another <abbr title="You Don't Know JS">YDKJS</abbr> book, ["Types & Grammar"](https://www.amazon.com/gp/product/B00SXHFTO4). Reading all 6 books in the series is a worthy endeavour for a full-time JavaScripter, but a tough sell otherwise.

This article aims to give you all the information you need to understand JavaScript classes in one place - so I've included a section covering some other relevant language aspects, aside from prototypes and classes; these are covered in sufficient detail for the purposes of this article, but not exhaustively. I've also included plenty of diagrams, as the story of prototypes and classes in JavaScript is essentially just about connections between different objects.

---

This article aims to give you all the information you need to understand JavaScript classes in one place. It is primarily intended for developers that mainly work with another language (Java, C++ or PHP) and cannot invest the time to learn the whole language - but have to interact with JavaScript codebases which will, more likely than not, be organized in classes. Working with classes 

- I think one of the - so I've included a section covering some other relevant language aspects, aside from prototypes and classes; these are covered in sufficient detail for the purposes of this article, but not exhaustively. I've also included plenty of diagrams, as the story of prototypes and classes in JavaScript is essentially just about connections between different objects.

---

For better or for worse, class-based object-oriented programming seems to be the dominating paradigm in those languages, and by the looks of it, in JavaScript as well - and that is why I think an article like this one is necessary.

---

Now notice what happens when the <abbr title="Right Hand Side">RHS</abbr> (right-hand side operand) is a primitive; the <abbr title="Left Hand Side">LHS</abbr> gets a _copy_ of the RHS. The values referenced via `foo.x` and `bar` are completely independent.

---

There are two main ways of addressing a particular property on an object - using the dot notation, or the square brackets. It is a common source of confusion which should we used when; but before addressing that, let's address another question - what constitutes a valid property name. The answer - any valid string. So this includes characters such as whitespace and emojis. However, if the string is not a valid _identifier_, it must be quoted and cannot be used with the dot notation.

What's a valid identifier ? JavaScript essentially piggybacks on [Unicode® Standard Annex #31](http://www.unicode.org/reports/tr31/#D1), because it already did the hard work of codifying what constitute a "legit" identifier and assigned the `ID_Start` to code points suitable for use as the first character in an identifier, and `ID_Continue` to code points suitable to 

TODO literal vs computed property name
https://tc39.es/ecma262/#prod-LiteralPropertyName

---

What are the implications of `[[Prototype]]` being an internal property ? Technically, it means that it might not even be there - it's a theoretical construct used in the specification to describe how the language should work, but concrete JavaScript implementations are free to implement it as they choose. The language does provide a straightforward set of methods for accessing and manipulating an objects `[[Prototype]]`, as we will see in later sections - but it is not directly available as a property. That being said, we can reason about it as if it is a hidden actual property set on objects, because it is described as such in the specification.

---

The goal here is to demystify how class-based programming works in JavaScript, because that seems to be the most common paradigm - at least for now. I'm not saying it's good or bad - it is up to the reader to judge the merits of different paradigms and patterns, but it is certainly better to do so while equipped with a good understanding of how they actually work.

---

So how can we get a hold of it ? One way is by using the [`__proto__`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto) property, but as you can see from the MDN documentation you really shouldn't use it is guaranteed to be available only in a browser environment and is considered deprecated.

---

["You Don't Know JS" series of books](https://www.amazon.com/gp/product/B07FK9VBD7), 

---

## Some Privacy, Please ?

- closures (module, old-school)
- WeakMaps
- Proxies
- Symbols
- native (proposal)

---

But to make sense of it you should read ["Types & Grammar"](https://www.amazon.com/gp/product/B00SXHFTO4) first, for some language fundamentals. 

---

This rule does not apply for pre-existing properties. If an object already has a property when it is prototype-linked to another object which has a read-only property with the same name, it will be shadowed. Once a read-only property is shadowed, it won't prevent setting a property with the same name on linked objects. In the snippet below, `baz.x` shadows the read-only `foo.x`, so an object linked to baz (`fum`) can have it's own "x".

```js
let baz = { x: 100 } // create an object with a pre-existing "x" property
Object.setPrototypeOf(baz, foo) // the read-only foo.x property will be shadowed by baz.x
let fum = Object.create(baz)
fum.x = 100 // works; a prototype has a read-only property with the same name, but it is shadowed
```

---

Let's say you're building a front-end framework. Clearly, we need more of these. The framework provides a `renderInstances` function, which users will call with an array of component instances; and the function will render them by calling the `render()` method on each instance that has the `visible` field equal to `true`. In addition to the `render()` function, each component instance must have access to `show()` and `hide()` methods, to manipulate the `visible` field. To keep things simple, let's just render to a string, rather than something more realistic.

Multiple types of components are required for a useful user interface; to begin with, the framework will provide `Label` and `Checkbox` as "class" functions, which can be used to create component instances. Some behaviour is shared between all types of components -  such as the visibility logic - so it makes sense to implement it only once on some sort of _base_ component class, and for the specialized versions of this class - known as _sub-types_, or _sub-classes_ - to inherit it. Let's call the base class `Component`, and implement the common functionality - initializing the `visible` flag, and methods to manipulate it.

Instances of the `Component` class should never be rendered - every sub-class should implement it's own `render()` method because, unlike with the visibility logic, there is no default implementation that would make sense for all `Component` sub-classes.

```js
// rendering function - renders visible instances to a string
function renderInstances(instances) {
  return instances
    .filter(instance => instance.visible)
    .map(instance => instance.render())
    .join(' ')
}
// "class" function - will be used as a constructor
function Component() {
  this.visible = true
}
// methods - these will be available to instances via the prototype chain
Component.prototype.show = function () { this.visible = true }
Component.prototype.hide = function () { this.visible = false }
```

That's the base class sorted; now let's take a stab at implementing the `Label` subclass, which will simply displays a text string. It must fulfill three requirements:
 1) inherit functionality from `Component` - the logic in the constructor, and the `show()` and `hide()` methods
 2) instances can be initialized with a string, to be used as the rendered text label
 3) provide an implementation for the `render()` method

Points 2) and 3) are trivial:
```js
function Label(text) {
  this.text = text
}
Label.prototype.render = function () {
  return `[ ${this.text} ]`
}
```

Before exploring a couple of options for implementing 1), let's do a quick theoretical reasons for doing so. One of the central ideas in <abbr title="Object Oriented Programming">OOP</abbr> is that instances of _any_ sub-type share a common set of behaviours - this allows implementing algorithms that are indifferent to the specific type of an object, and only require that the objects implement the common set of behaviours. This idea is known as the "Liskov Substitution principle" and is the "L" in [SOLID](https://en.wikipedia.org/wiki/SOLID); "substitution" refers to the ability to substitute objects of any sub-type, without affecting the behaviour of the program with regards to the _shared_ properties.

In our case, the generic algorithm is the `renderInstances` function - it works with instances of any sub-type of `Component` that is correctly implemented, because it only uses functionality that is common to all sub-types. We should be able to substitute a `Label` instance with a `Checkbox` instance, and `renderInstances` would work the same way with regards to shared `Component` functionality.



The "correctly implemented" bit is important because it is something that can be _incorrectly_ implemented.

```js
let label1 = new Label("Label 1")
let label2 = new Label("Label 1")
let checkbox = new Checkbox("Do it?", true)
const renderedString = renderInstances([label1, label2, checkbox])
```

we've already seen some of the hallmarks - using `new` to create new objects, the `constructor` property. But there are a few more things that happen in class-based languages. One such thing is calling the "parent" constructor; when the sub-class is instantiated, one would expect the super-class constructor to be called. Therefore, we need to make sure to call the parent function, which is also the super-class constructor:

```js
function Bar (initialCount) {
  Foo.call(this, initialCount)
}
```
We also need a way for `Bar` to inherit from `Foo`; this is done via the prototype chain:

```js
Bar.prototype = Object.create(Foo.prototype)
```

Why not just `Bar.prototype = Foo.prototype` ? Because then the `prototype` property of both function objects would reference the exact same object. If you add a property to `Bar.prototype`, that property would also be accessible by all `Foo` instances - and vice versa.

We could also try `Bar.prototype = new Foo()`. Once `Bar.prototype` is initialized with an object linked to `Foo.prototype`, it can be further enriched with properties specific to `Bar`, and these will not be accessible to objects linked to `Foo.prototype`. However, we need to be mindful of side effects, because we're actually invoking `Foo` when creating `Bar.prototype`. Whether this is or isn't an issue depends on what happens inside `Foo`, but it should be obvious that this is really just a more complex and error prone way of getting the same effect as setting `Bar.prototype` to an object explicitly linked to `Foo.prototype`, which does not involve actually invoking `Foo`.

---

### Structure
- Big Picture
- Prerequisites - undefined, null, references, strict mode
- Prototype Links
- Implementing "classical" OO with Prototypes
- Using `class`
