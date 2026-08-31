import { describe, it, expect } from "vitest";
import { createContainer, provide } from "@separa/ioc-inversify";
import { Service, defineDecoratedService, createToken } from "@separa/core";

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
});
