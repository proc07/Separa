import { describe, it, expect, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createSeparaPlugin, useService } from "@separa/vue";
import { createContainer } from "@separa/ioc-inversify";
import {
  Service,
  Inject,
  defineDecoratedService,
  createContractToken,
  createServiceHandle,
  getReactiveController,
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

  // ===================================================================
  // #9 — @Autowired 注入属性在 Vue facade 中不被包装为 Ref
  // ===================================================================
  it("exposes @Inject injected properties as plain values (not Ref) in facade", () => {
    @Service({ scope: "singleton" })
    class LogService {
      prefix = "LOG";
    }

    @Service({ scope: "singleton" })
    class AppService {
      status = "ok";

      // @Inject 标记的属性会被加入 nonReactiveKeys — 在 Vue facade 中应直接暴露而非包装为 Ref
      @Inject(LogService)
      logger!: LogService;

      get message() {
        return `[${this.logger?.prefix}] ${this.status}`;
      }
    }

    const container = createContainer({
      definitions: [
        defineDecoratedService(LogService, ["prefix"]),
        defineDecoratedService(AppService, ["status"]),
      ],
    });
    const plugin = createSeparaPlugin(container);

    let facadeInspected: any = null;
    const app = createApp({
      setup() {
        const facade = useService(AppService);
        facadeInspected = facade;
        return () => h("div", "ok");
      },
    });
    app.use(plugin);
    const root = document.createElement("div");
    app.mount(root);

    // status 是 stateKey — 应被包装为 Ref，有 .value 属性
    expect(facadeInspected.status).toHaveProperty("value");
    expect(facadeInspected.status.value).toBe("ok");

    // logger 是 @Inject 注入属性（nonReactiveKey）— 应直接暴露原始实例，不是 Ref
    expect(facadeInspected.logger).toBeInstanceOf(LogService);
    expect(typeof facadeInspected.logger.prefix).toBe("string"); // 直接访问属性，不需要 .value
  });

  // ===================================================================
  // #7 — 服务热替换行为说明（预期：级联断裂，属于已知限制）
  // ===================================================================
  it("runtime hot-swap of injected dependency does NOT auto-cascade (known limitation)", () => {
    @Service({ scope: "singleton" })
    class DepService {
      value = "original";
    }

    @Service({ scope: "singleton" })
    class HostService {
      status = "ok";

      @Inject(DepService)
      dep!: DepService;
    }

    const container = createContainer({
      definitions: [
        defineDecoratedService(DepService, ["value"]),
        defineDecoratedService(HostService, ["status"]),
      ],
    });
    const plugin = createSeparaPlugin(container);

    const app = createApp({
      setup() {
        useService(HostService);
        return () => h("div", "ok");
      },
    });
    app.use(plugin);
    const root = document.createElement("div");
    app.mount(root);

    const host = container.get(HostService);
    const ctrl = getReactiveController(host)!;
    const listener = vi.fn();
    ctrl.subscribe(listener);

    // 正常使用：dep.value 变更通过 linkDependency 级联到 host
    const dep = container.get(DepService);
    dep.value = "updated";
    expect(listener).toHaveBeenCalledTimes(1);

    // 热替换：直接覆写属性（绕过 linkDependency，级联会断裂）
    // 这是已知限制，框架不支持运行时注入替换
    const newDep = new DepService();
    (host as any).dep = newDep;

    listener.mockClear();
    // newDep 未经过 linkDependency，其变更不触发 host
    newDep.value = "hot-swapped";
    expect(listener).not.toHaveBeenCalled();
  });
});
