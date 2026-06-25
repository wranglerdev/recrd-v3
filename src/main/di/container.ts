// Lightweight dependency-injection container (PRD §3, §31).
//
// Deliberately dependency-free (tsyringe is optional per the PRD): wiring is done
// with explicit providers so constructor injection stays visible and there are no
// decorators or reflection. Composition happens in the main process; this module
// is the composition-root primitive.

/**
 * A typed injection token. Identity (not description) is used as the map key, so
 * two tokens with the same description are still distinct.
 */
export class Token<T> {
  // `_marker` makes the generic parameter participate in type-checking, so a
  // `Token<A>` is not assignable to a slot expecting `Token<B>`.
  declare private readonly _marker: T;
  constructor(readonly description: string) {}
}

export type Lifecycle = "singleton" | "transient";

export interface ValueProvider<T> {
  useValue: T;
}

export interface FactoryProvider<T> {
  useFactory: (container: Container) => T;
  lifecycle?: Lifecycle;
}

export interface ClassProvider<T> {
  useClass: new (...args: never[]) => T;
  deps?: readonly Token<unknown>[];
  lifecycle?: Lifecycle;
}

export type Provider<T> = ValueProvider<T> | FactoryProvider<T> | ClassProvider<T>;

interface Registration<T> {
  readonly provider: Provider<T>;
  readonly lifecycle: Lifecycle;
  resolved?: { value: T };
}

function isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T> {
  return "useValue" in provider;
}

function isClassProvider<T>(provider: Provider<T>): provider is ClassProvider<T> {
  return "useClass" in provider;
}

export class Container {
  private readonly registrations = new Map<Token<unknown>, Registration<unknown>>();
  private readonly resolving = new Set<Token<unknown>>();

  /** Registers a provider for a token. Fails fast on duplicate registration. */
  register<T>(token: Token<T>, provider: Provider<T>): this {
    if (this.registrations.has(token)) {
      throw new Error(`Token already registered: ${token.description}`);
    }
    const lifecycle: Lifecycle = isValueProvider(provider)
      ? "singleton"
      : (provider.lifecycle ?? "singleton");
    this.registrations.set(token, { provider, lifecycle });
    return this;
  }

  /** Returns true when a provider is registered for the token. */
  has<T>(token: Token<T>): boolean {
    return this.registrations.has(token);
  }

  /** Resolves a token. Fails fast for unknown tokens and circular dependencies. */
  resolve<T>(token: Token<T>): T {
    const registration = this.registrations.get(token) as Registration<T> | undefined;
    if (registration === undefined) {
      throw new Error(`Token not registered: ${token.description}`);
    }

    if (registration.lifecycle === "singleton" && registration.resolved !== undefined) {
      return registration.resolved.value;
    }

    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected while resolving: ${token.description}`);
    }

    this.resolving.add(token);
    try {
      const value = this.instantiate(registration.provider);
      if (registration.lifecycle === "singleton") {
        registration.resolved = { value };
      }
      return value;
    } finally {
      this.resolving.delete(token);
    }
  }

  private instantiate<T>(provider: Provider<T>): T {
    if (isValueProvider(provider)) {
      return provider.useValue;
    }
    if (isClassProvider(provider)) {
      const args = (provider.deps ?? []).map((dep) => this.resolve(dep));
      return new provider.useClass(...(args as never[]));
    }
    return provider.useFactory(this);
  }
}
