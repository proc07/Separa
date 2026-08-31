import { describe, it, expect, vi } from "vitest";
import { createContainer } from "@separa/ioc-inversify";
import { Service, defineDecoratedService, defineService } from "@separa/core";

describe("@separa/ioc-inversify - Lifecycle", () => {
  it("invokes onInit and onDestroy on container dispose", async () => {
    const initSpy = vi.fn();
    const destroySpy = vi.fn();

    @Service({ scope: "singleton" })
    class LifecycleService {
      onInit() {
        initSpy();
      }
      onDestroy() {
        destroySpy();
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(LifecycleService)],
    });

    container.get(LifecycleService);
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(destroySpy).not.toHaveBeenCalled();

    await container.dispose();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it("invokes dispose() method if onDestroy is absent", async () => {
    const disposeSpy = vi.fn();

    @Service({ scope: "singleton" })
    class DisposablesService {
      dispose() {
        disposeSpy();
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(DisposablesService)],
    });

    container.get(DisposablesService);
    await container.dispose();
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it("invokes async lifecycle methods via getAsync", async () => {
    let asyncInitDone = false;
    let asyncDestroyDone = false;

    @Service({ scope: "singleton" })
    class AsyncLifecycleService {
      async onInit() {
        await new Promise((r) => setTimeout(r, 5));
        asyncInitDone = true;
      }
      async onDestroy() {
        await new Promise((r) => setTimeout(r, 5));
        asyncDestroyDone = true;
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(AsyncLifecycleService)],
    });

    await container.getAsync(AsyncLifecycleService);
    expect(asyncInitDone).toBe(true);

    await container.dispose();
    expect(asyncDestroyDone).toBe(true);
  });

  it("handles async factory function in definition", async () => {
    class AsyncFactoryService {
      initialized = false;
    }

    const container = createContainer({
      definitions: [
        defineService(
          {
            target: AsyncFactoryService,
            token: AsyncFactoryService,
            scope: "singleton",
            multi: false,
            injections: new Map(),
            nonReactiveKeys: new Set(),
          },
          [],
          [],
        ),
      ],
    });

    const instance = container.get(AsyncFactoryService);
    expect(instance).toBeInstanceOf(AsyncFactoryService);
  });

  it("handles errors during dispose and throws AggregateError", async () => {
    @Service({ scope: "singleton" })
    class FailingDisposeService {
      onDestroy() {
        throw new Error("Dispose boom!");
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(FailingDisposeService)],
    });

    container.get(FailingDisposeService);
    await expect(() => container.dispose()).rejects.toThrow(AggregateError);
  });
});
