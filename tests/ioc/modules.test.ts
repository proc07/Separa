import { describe, it, expect } from "vitest";
import { createContainer } from "@separa/ioc-inversify";
import { Service, defineDecoratedService, createToken } from "@separa/core";

describe("@separa/ioc-inversify - Modules", () => {
  const FeatureToken = createToken<{ greet(): string }>("feature");

  @Service({ scope: "singleton", token: FeatureToken })
  class FeatureService {
    greet() {
      return "feature-active";
    }
  }

  it("loads and unloads dynamic modules", async () => {
    const container = createContainer();
    expect(container.tryGet(FeatureToken)).toBeUndefined();

    const mod = container.loadModule({
      id: "feature-mod",
      definitions: [defineDecoratedService(FeatureService)],
    });

    expect(mod.get(FeatureToken).greet()).toBe("feature-active");

    await container.unloadModule("feature-mod");
    expect(() => mod.tryGet(FeatureToken)).toThrow("The Separa container has been disposed.");
  });

  it("throws error when loading module with duplicate id", () => {
    const container = createContainer();

    container.loadModule({
      id: "dup-mod",
      definitions: [],
    });

    expect(() =>
      container.loadModule({
        id: "dup-mod",
        definitions: [],
      }),
    ).toThrow('Service module "dup-mod" is already loaded.');
  });
});
