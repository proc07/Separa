import { describe, it, expect, vi } from "vitest";
import {
  Service,
  Inject,
  Optional,
  InjectMany,
  createToken,
  defineDecoratedService,
  defineService,
} from "@separa/core";

describe("@separa/core - registry", () => {
  const tokA = createToken<string>("tokA");
  const tokB = createToken<number>("tokB");
  const tokQ = createToken<string>("tokQ");

  it("extracts prototype methods across inheritance hierarchy", () => {
    class GrandParent {
      gpMethod() {}
    }
    class Parent extends GrandParent {
      parentMethod() {}
    }
    @Service()
    class Child extends Parent {
      childMethod() {}
    }

    const def = defineDecoratedService(Child);
    expect(def.methodKeys).toContain("gpMethod");
    expect(def.methodKeys).toContain("parentMethod");
    expect(def.methodKeys).toContain("childMethod");
    expect(def.methodKeys).not.toContain("constructor");
  });

  it("throws error when defineDecoratedService is called on undecorated class", () => {
    class Undecorated {}
    expect(() => defineDecoratedService(Undecorated)).toThrow("is not decorated with @Service()");
  });

  it("throws error when constructor parameter is missing injection token", () => {
    @Service()
    class BadService {
      constructor(readonly param1: any) {}
    }
    expect(() => defineDecoratedService(BadService)).toThrow("Missing injection token for BadService constructor parameter #0");
  });

  it("builds factory that resolves dependencies from container and initializes onInit", async () => {
    const initSpy = vi.fn();

    @Service({ scope: "singleton", qualifier: "myQ" })
    class CompleteService {
      count = 0;
      constructor(
        @Inject(tokA) readonly a: string,
        @Optional(tokB) readonly b: number | undefined,
      ) {}

      onInit() {
        initSpy(this.a, this.b);
      }
    }

    const def = defineDecoratedService(CompleteService, ["count"]);
    expect(def.id).toBe("CompleteService");
    expect(def.qualifier).toBe("myQ");
    expect(def.dependencies).toHaveLength(2);
    expect(def.dependencies[0]).toEqual({ token: tokA });
    expect(def.dependencies[1]).toEqual({ token: tokB, optional: true });

    // Mock container
    const mockContainer = {
      get: vi.fn().mockReturnValue("hello"),
      tryGet: vi.fn().mockReturnValue(42),
      getAll: vi.fn().mockReturnValue([]),
      getQualified: vi.fn(),
      tryGetQualified: vi.fn(),
    };

    const instance = def.factory(mockContainer as any) as CompleteService;
    expect(instance.a).toBe("hello");
    expect(instance.b).toBe(42);

    expect(def.initialize).toBeDefined();
    def.initialize!(instance, mockContainer as any);
    expect(initSpy).toHaveBeenCalledWith("hello", 42);
  });

  it("supports factory resolving multi, qualified, and optional qualified dependencies", () => {
    const multiTok = createToken<string>("multiTok");

    class ComplexDependenciesService {
      constructor(
        readonly items: string[],
        readonly qualifiedProp: string,
        readonly optQualifiedProp?: string,
      ) {}
    }

    const customMetadata = {
      target: ComplexDependenciesService,
      token: ComplexDependenciesService,
      scope: "singleton" as const,
      multi: false,
      injections: new Map([
        [0, { token: multiTok, multiple: true }],
        [1, { token: tokQ, qualifier: "primary" }],
        [2, { token: tokQ, qualifier: "backup", optional: true }],
      ]),
      nonReactiveKeys: new Set<PropertyKey>(),
    };

    const def = defineService(customMetadata);

    const mockContainer = {
      get: vi.fn(),
      tryGet: vi.fn(),
      getAll: vi.fn().mockReturnValue(["item1", "item2"]),
      getQualified: vi.fn().mockReturnValue("qualified-val"),
      tryGetQualified: vi.fn().mockReturnValue("opt-qualified-val"),
    };

    const instance = def.factory(mockContainer as any) as ComplexDependenciesService;
    expect(instance.items).toEqual(["item1", "item2"]);
    expect(instance.qualifiedProp).toBe("qualified-val");
    expect(instance.optQualifiedProp).toBe("opt-qualified-val");
    expect(mockContainer.getAll).toHaveBeenCalledWith(multiTok);
    expect(mockContainer.getQualified).toHaveBeenCalledWith(tokQ, "primary");
    expect(mockContainer.tryGetQualified).toHaveBeenCalledWith(tokQ, "backup");
  });

  it("handles asynchronous onInit lifecycle initialization", async () => {
    let initCompleted = false;

    @Service()
    class AsyncInitService {
      async onInit() {
        await new Promise((r) => setTimeout(r, 5));
        initCompleted = true;
      }
    }

    const def = defineDecoratedService(AsyncInitService);
    const instance = def.factory({} as any) as AsyncInitService;
    expect(def.initialize).toBeDefined();

    await def.initialize!(instance, {} as any);
    expect(initCompleted).toBe(true);
  });
});
