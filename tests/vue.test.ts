import { describe, it, expect } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createSeparaPlugin, useService } from "@separa/vue";
import { createContainer } from "@separa/ioc-inversify";
import {
  Service,
  defineDecoratedService,
  createContractToken,
  createServiceHandle,
} from "@separa/core";

describe("@separa/vue", () => {
  it("throws error when useService is called without active container", () => {
    expect(() => useService(class Untracked {})).toThrow(
      "useService() requires createSeparaPlugin(container) to be installed.",
    );
  });

  it("wraps service in reactive Ref facade and triggers Vue reactions", async () => {
    @Service({ scope: "singleton" })
    class VueCounterService {
      count = 0;
      get doubled() {
        return this.count * 2;
      }
      inc() {
        this.count += 1;
      }
    }

    const container = createContainer({
      definitions: [defineDecoratedService(VueCounterService, ["count"])],
    });
    const plugin = createSeparaPlugin(container);

    let observedCount = -1;
    let observedDoubled = -1;
    const Comp = defineComponent({
      setup() {
        const service = useService(VueCounterService);
        return () => {
          observedCount = service.count.value;
          observedDoubled = service.doubled.value;
          return h("span", `${service.count.value}-${service.doubled.value}`);
        };
      },
    });

    const app = createApp(Comp);
    app.use(plugin);
    const root = document.createElement("div");
    app.mount(root);

    expect(observedCount).toBe(0);
    expect(observedDoubled).toBe(0);

    const service = container.get(VueCounterService);
    service.inc();
    await nextTick();

    expect(observedCount).toBe(1);
    expect(observedDoubled).toBe(2);
  });

  it("supports resolving via ServiceHandle in Vue", () => {
    interface ILogger {
      level: string;
    }
    const LoggerToken = createContractToken<ILogger>("ILogger");

    @Service({ scope: "singleton", token: LoggerToken })
    class VueLogger implements ILogger {
      level = "info";
    }
    const LoggerHandle = createServiceHandle("logger", LoggerToken);

    const container = createContainer({
      definitions: [defineDecoratedService(VueLogger, ["level"])],
    });
    const plugin = createSeparaPlugin(container);

    const app = createApp({
      setup() {
        const logger = useService(LoggerHandle);
        expect(logger.level.value).toBe("info");
        return () => h("div", logger.level.value);
      },
    });
    app.use(plugin);
    const root = document.createElement("div");
    app.mount(root);
  });

  it("resolves non-reactive services directly without wrapping", () => {
    class PlainVueService {
      name = "plain-vue";
    }

    const container = createContainer({
      definitions: [
        {
          id: "plain-vue",
          token: PlainVueService,
          implementation: PlainVueService,
          scope: "singleton",
          multi: false,
          dependencies: [],
          stateKeys: [],
          methodKeys: [],
          factory: () => new PlainVueService(),
        },
      ],
    });
    const plugin = createSeparaPlugin(container);

    const app = createApp({
      setup() {
        const service = useService(PlainVueService);
        expect(service.name).toBe("plain-vue");
        return () => h("div", service.name);
      },
    });
    app.use(plugin);
    const root = document.createElement("div");
    app.mount(root);
  });
});
