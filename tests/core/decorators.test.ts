import { describe, it, expect } from "vitest";
import {
  Autowired,
  Service,
  Inject,
  Optional,
  InjectMany,
  Qualifier,
  NonReactive,
  getServiceMetadata,
  createToken,
} from "@separa/core";

describe("@separa/core - decorators", () => {
  const t1 = createToken("T1");
  const t2 = createToken("T2");
  const t3 = createToken("T3");

  it("records metadata with all options and parameter decorators", () => {
    const customToken = createToken<object>("CustomToken");

    @Service({
      scope: "singleton",
      multi: true,
      qualifier: "special",
      token: customToken,
    })
    class FullService {
      @NonReactive() staticProp = "static";
      @NonReactive() nonReactiveData = 123;
      reactiveData = 456;

      constructor(
        @Inject(t1) readonly a: any,
        @Optional(t2) readonly b: any,
        @InjectMany(t3) readonly c: any[],
        @Qualifier("paramQ") readonly d: any,
      ) {}
    }

    const meta = getServiceMetadata(FullService);
    expect(meta).toBeDefined();
    expect(meta?.target).toBe(FullService);
    expect(meta?.token).toBe(customToken);
    expect(meta?.scope).toBe("singleton");
    expect(meta?.multi).toBe(true);
    expect(meta?.qualifier).toBe("special");

    expect(meta?.nonReactiveKeys.has("nonReactiveData")).toBe(true);
    expect(meta?.nonReactiveKeys.has("reactiveData")).toBe(false);

    expect(meta?.injections.get(0)).toEqual({ token: t1 });
    expect(meta?.injections.get(1)).toEqual({ token: t2, optional: true });
    expect(meta?.injections.get(2)).toEqual({ token: t3, multiple: true });
    expect(meta?.injections.get(3)).toBeUndefined(); // Qualifier does not write to runtime injections
  });

  it("defaults scope to transient and token to target constructor", () => {
    @Service()
    class DefaultService {}

    const meta = getServiceMetadata(DefaultService);
    expect(meta).toBeDefined();
    expect(meta?.scope).toBe("transient");
    expect(meta?.token).toBe(DefaultService);
    expect(meta?.multi).toBe(false);
  });

  it("returns undefined for undecorated classes", () => {
    class Undecorated {}
    expect(getServiceMetadata(Undecorated)).toBeUndefined();
  });

  it("supports property injection via @Inject, @Optional, and @InjectMany on class fields", () => {
    const p1Token = createToken<string>("P1");
    const p2Token = createToken<string>("P2");

    class ServiceWithProperties {
      @Inject(p1Token)
      prop1!: string;

      @Optional(p2Token)
      prop2?: string;
    }

    const meta = getServiceMetadata(ServiceWithProperties);
    expect(meta).toBeUndefined(); // not decorated with @Service yet

    // check metadata directly
    @Service()
    class DecoratedWithProperties {
      @Inject(p1Token)
      prop1!: string;

      @Optional(p2Token)
      prop2?: string;
    }

    const decoratedMeta = getServiceMetadata(DecoratedWithProperties);
    expect(decoratedMeta?.propertyInjections?.get("prop1")).toEqual({ token: p1Token });
    expect(decoratedMeta?.propertyInjections?.get("prop2")).toEqual({ token: p2Token, optional: true });
    expect(decoratedMeta?.nonReactiveKeys.has("prop1")).toBe(true);
    expect(decoratedMeta?.nonReactiveKeys.has("prop2")).toBe(true);
  });

  it("supports @Autowired() and zero-argument @Inject() via TypeScript metadata reflection", () => {
    class InjectedDep {}

    @Service()
    class ServiceWithAutowired {
      @Autowired()
      dep1!: InjectedDep;

      @Inject()
      dep2!: InjectedDep;
    }

    const meta = getServiceMetadata(ServiceWithAutowired);
    expect(meta).toBeDefined();
    expect(meta?.propertyInjections?.get("dep1")?.token).toBe(InjectedDep);
    expect(meta?.propertyInjections?.get("dep2")?.token).toBe(InjectedDep);
    expect(meta?.nonReactiveKeys.has("dep1")).toBe(true);
    expect(meta?.nonReactiveKeys.has("dep2")).toBe(true);
  });
});
