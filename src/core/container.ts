import { getInjectParams } from "./service";

export type Factory<T> = (container: Container) => T;

export interface ServiceProvider<T = any> {
  token:       string | symbol | (new (...args: any[]) => T);
  useClass?:   new (...args: any[]) => T;
  useValue?:   T;
  useFactory?: Factory<T>;
  deps?:       any[];
  scope?:      "singleton" | "transient";
}

/**
 * Global registry — populated by @Service decorator at class-definition time.
 * Maps class constructor → { deps: [...] }
 */
export const serviceRegistry = new Map<any, { deps: any[] }>();

export class Container {
  private registry   = new Map<any, ServiceProvider>();
  private singletons = new Map<any, any>();

  constructor(private parent?: Container) {}

  register(providers: ServiceProvider[]) {
    for (const p of providers) this.registry.set(p.token, p);
    return this;
  }

  addClass<T>(Cls: new (...args: any[]) => T) {
    const meta = serviceRegistry.get(Cls);
    this.registry.set(Cls, {
      token:    Cls,
      useClass: Cls,
      deps:     meta?.deps ?? [],
      scope:    "singleton",
    });
    return this;
  }

  resolve<T>(token: any): T {
    if (this.singletons.has(token)) return this.singletons.get(token);

    let provider = this.registry.get(token);

    // Auto-register if decorated with @Service
    if (!provider && typeof token === "function" && serviceRegistry.has(token)) {
      this.addClass(token);
      provider = this.registry.get(token);
    }

    // Bubble up to parent container
    if (!provider && this.parent) return this.parent.resolve<T>(token);

    if (!provider) {
      throw new Error(
        `[Nelysia DI] No provider found for: ${String(token?.name ?? token)}\n` +
        `Hint: add it to services[] in your @Plugin, or use @Inject on constructor params.`
      );
    }

    let instance: T;

    if ("useValue" in provider && provider.useValue !== undefined) {
      return provider.useValue as T;

    } else if (provider.useFactory) {
      instance = provider.useFactory(this) as T;

    } else if (provider.useClass) {
      const Cls        = provider.useClass;
      const injectMap  = getInjectParams(Cls);
      const declaredDeps: any[] = provider.deps ?? [];

      if (declaredDeps.length > 0) {
        // Use declared deps[], @Inject overrides per-index
        const args = declaredDeps.map((dep: any, i: number) => {
          const override = injectMap.get(i);
          return this.resolve(override ?? dep);
        });
        instance = new Cls(...args);

      } else if (injectMap.size > 0) {
        // No deps[] but @Inject params exist — build from inject map
        const maxIdx = Math.max(...injectMap.keys());
        const args   = new Array(maxIdx + 1).fill(undefined);
        for (const [i, tok] of injectMap) args[i] = this.resolve(tok);
        instance = new Cls(...args);

      } else {
        // No deps — instantiate with no args
        instance = new Cls();
      }

    } else {
      throw new Error("[Nelysia DI] Invalid provider — needs useClass, useValue, or useFactory.");
    }

    if (provider.scope !== "transient") {
      this.singletons.set(provider.token, instance);
    }

    return instance;
  }

  child() { return new Container(this); }
}
