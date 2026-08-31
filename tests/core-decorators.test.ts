import { describe, it, expect } from "vitest";
import {
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
});
