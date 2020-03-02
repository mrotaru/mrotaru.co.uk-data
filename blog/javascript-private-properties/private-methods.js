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