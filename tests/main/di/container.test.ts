import { describe, expect, it } from "vitest";
import { Container, Token } from "@main/di/container";

describe("Container", () => {
  it("resolves a value provider", () => {
    const c = new Container();
    const token = new Token<number>("answer");
    c.register(token, { useValue: 42 });

    expect(c.resolve(token)).toBe(42);
  });

  it("resolves a factory provider and passes the container", () => {
    const c = new Container();
    const dep = new Token<number>("dep");
    const token = new Token<number>("derived");
    c.register(dep, { useValue: 10 });
    c.register(token, { useFactory: (container) => container.resolve(dep) + 5 });

    expect(c.resolve(token)).toBe(15);
  });

  it("resolves a class provider with declared dependencies", () => {
    class Greeter {
      constructor(private readonly name: string) {}
      greet(): string {
        return `hi ${this.name}`;
      }
    }
    const nameToken = new Token<string>("name");
    const greeterToken = new Token<Greeter>("greeter");
    const c = new Container();
    c.register(nameToken, { useValue: "ada" });
    c.register(greeterToken, { useClass: Greeter, deps: [nameToken] });

    expect(c.resolve(greeterToken).greet()).toBe("hi ada");
  });

  it("returns the same instance for singletons (default)", () => {
    const c = new Container();
    const token = new Token<object>("singleton");
    c.register(token, { useFactory: () => ({}) });

    expect(c.resolve(token)).toBe(c.resolve(token));
  });

  it("returns a fresh instance for transient lifecycle", () => {
    const c = new Container();
    const token = new Token<object>("transient");
    c.register(token, { useFactory: () => ({}), lifecycle: "transient" });

    expect(c.resolve(token)).not.toBe(c.resolve(token));
  });

  it("fails fast when resolving an unregistered token", () => {
    const c = new Container();
    const token = new Token<number>("missing");

    expect(() => c.resolve(token)).toThrowError(/not registered.*missing/i);
  });

  it("fails fast on duplicate registration", () => {
    const c = new Container();
    const token = new Token<number>("dup");
    c.register(token, { useValue: 1 });

    expect(() => c.register(token, { useValue: 2 })).toThrowError(/already registered.*dup/i);
  });

  it("detects circular dependencies", () => {
    const c = new Container();
    const a = new Token<number>("a");
    const b = new Token<number>("b");
    c.register(a, { useFactory: (container) => container.resolve(b) });
    c.register(b, { useFactory: (container) => container.resolve(a) });

    expect(() => c.resolve(a)).toThrowError(/circular/i);
  });

  it("reports whether a token is registered", () => {
    const c = new Container();
    const token = new Token<number>("present");
    expect(c.has(token)).toBe(false);
    c.register(token, { useValue: 1 });
    expect(c.has(token)).toBe(true);
  });
});
