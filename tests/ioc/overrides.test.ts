import { describe, it, expect } from "vitest";
import { createContainer, provide } from "@separa/ioc-inversify";
import { Service, Inject, defineDecoratedService, createToken } from "@separa/core";

describe("@separa/ioc-inversify - Overrides", () => {
  const ApiToken = createToken<{ get(): string }>("api");

  @Service({ scope: "singleton", token: ApiToken })
  class RealApi {
    get() {
      return "real";
    }
  }

  it("overrides with useValue", () => {
    const container = createContainer({
      definitions: [defineDecoratedService(RealApi)],
      overrides: [
        provide(ApiToken).useValue({ get: () => "mocked-value" }),
      ],
    });

    expect(container.get(ApiToken).get()).toBe("mocked-value");
  });

  it("overrides with useClass", () => {
    class MockApi {
      get() {
        return "mocked-class";
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(RealApi)],
      overrides: [provide(ApiToken).useClass(MockApi)],
    });

    expect(container.get(ApiToken).get()).toBe("mocked-class");
  });

  it("throws error when override does not specify implementation or value", () => {
    expect(() =>
      createContainer({
        overrides: [{ token: ApiToken } as any],
      }),
    ).toThrow("Override must define a class or value.");
  });

  it("injects properties automatically into useValue instances and resolve() instances", () => {
    const LoggerToken = createToken<{ log(msg: string): string }>("Logger");

    class DynamicItem {
      @Inject(LoggerToken)
      logger!: { log(msg: string): string };

      constructor(readonly name: string) {}
    }

    const container = createContainer({
      overrides: [
        provide(LoggerToken).useValue({ log: (msg: string) => `logged: ${msg}` }),
      ],
    });

    // 1. Test useValue property injection
    const item = new DynamicItem("Widget");
    const child = container.createScope({
      overrides: [provide(ApiToken).useValue(item as any)],
    });

    expect(item.logger).toBeDefined();
    expect(item.logger.log("hello")).toBe("logged: hello");

    // 2. Test container.resolve()
    const resolved = container.resolve(DynamicItem, "ResolvedWidget");
    expect(resolved.name).toBe("ResolvedWidget");
    expect(resolved.logger).toBeDefined();
    expect(resolved.logger.log("test")).toBe("logged: test");
  });
});
