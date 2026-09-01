import { describe, it, expect, vi } from "vitest";
import {
  enhanceService,
  getReactiveController,
  isReactiveService,
  disposeReactiveService,
} from "@separa/core";

describe("@separa/core - state-enhancer edge cases", () => {
  // ===================================================================
  // #1 — 嵌套普通对象内的深层属性变更
  // ===================================================================
  describe("deep nested plain object mutations", () => {
    it("detects deep mutation inside a plain object stateKey via Valtio proxy", () => {
      class ConfigService {
        config = { display: { fontSize: 14, theme: "light" } };
      }

      const service = enhanceService(new ConfigService(), {
        stateKeys: ["config"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      // Deep mutation through the proxy
      service.config.display.fontSize = 18;
      expect(listener).toHaveBeenCalled();
      expect(service.config.display.fontSize).toBe(18);
    });

    it("detects adding a new nested key inside a plain object stateKey", () => {
      class DynamicService {
        data: Record<string, any> = { a: 1 };
      }

      const service = enhanceService(new DynamicService(), {
        stateKeys: ["data"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      service.data.b = 2;
      expect(listener).toHaveBeenCalled();
      expect(service.data.b).toBe(2);
    });

    it("detects full replacement of a nested object", () => {
      class NestedService {
        settings = { level: 1 };
      }

      const service = enhanceService(new NestedService(), {
        stateKeys: ["settings"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      service.settings = { level: 99 };
      expect(listener).toHaveBeenCalled();
      expect(service.settings.level).toBe(99);
    });
  });

  // ===================================================================
  // #2 — 数组内元素 push/splice 等原地变更
  // ===================================================================
  describe("array in-place mutations", () => {
    it("detects array push via Valtio proxy", () => {
      class ListService {
        items: string[] = ["a", "b"];
      }

      const service = enhanceService(new ListService(), {
        stateKeys: ["items"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      service.items.push("c");
      expect(listener).toHaveBeenCalled();
      expect(service.items).toEqual(["a", "b", "c"]);
    });

    it("detects array splice via Valtio proxy", () => {
      class ListService {
        items = [1, 2, 3, 4, 5];
      }

      const service = enhanceService(new ListService(), {
        stateKeys: ["items"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      service.items.splice(1, 2);
      expect(listener).toHaveBeenCalled();
      expect(service.items).toEqual([1, 4, 5]);
    });

    it("detects array element assignment via index", () => {
      class ListService {
        items = ["x", "y", "z"];
      }

      const service = enhanceService(new ListService(), {
        stateKeys: ["items"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      service.items[1] = "REPLACED";
      expect(listener).toHaveBeenCalled();
      expect(service.items[1]).toBe("REPLACED");
    });

    it("detects full array replacement", () => {
      class ListService {
        items = [1, 2, 3];
      }

      const service = enhanceService(new ListService(), {
        stateKeys: ["items"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      service.items = [10, 20];
      expect(listener).toHaveBeenCalled();
      expect(service.items).toEqual([10, 20]);
    });
  });

  // ===================================================================
  // #3 — 值从一个响应式服务提取后赋值到另一个对象
  // ===================================================================
  describe("value extraction from reactive service", () => {
    it("primitive value extracted is disconnected from reactive chain", () => {
      class PriceService {
        price = 100;
      }

      const service = enhanceService(new PriceService(), {
        stateKeys: ["price"],
        methodKeys: [],
      });

      const extractedPrice = service.price;
      expect(extractedPrice).toBe(100);

      service.price = 200;

      // Extracted primitive is a copy — not reactive
      expect(extractedPrice).toBe(100);
      expect(service.price).toBe(200);
    });

    it("object reference extracted retains Valtio proxy reactivity", () => {
      class StoreService {
        data = { count: 0 };
      }

      const service = enhanceService(new StoreService(), {
        stateKeys: ["data"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      // Extract object reference (still a Valtio proxy)
      const dataRef = service.data;
      dataRef.count = 42;
      expect(listener).toHaveBeenCalled();
      expect(service.data.count).toBe(42);
    });

    it("object reference is disconnected after full replacement of stateKey", () => {
      class StoreService {
        data = { count: 0 };
      }

      const service = enhanceService(new StoreService(), {
        stateKeys: ["data"],
        methodKeys: [],
      });

      const oldDataRef = service.data;

      // Replace the entire stateKey field
      service.data = { count: 99 };

      // Old reference is now stale
      expect(service.data.count).toBe(99);
      // Old ref may still hold old value
      expect(oldDataRef.count).toBe(0);
    });
  });

  // ===================================================================
  // #4 — linkDependency 独立单元测试
  // ===================================================================
  describe("linkDependency cascade (pure unit test)", () => {
    it("linkDependency establishes subscription so child changes notify parent", () => {
      class ChildService {
        value = 0;
      }

      class ParentService {
        result = 0;
      }

      const child = enhanceService(new ChildService(), {
        stateKeys: ["value"],
        methodKeys: [],
      });

      const parent = enhanceService(new ParentService(), {
        stateKeys: ["result"],
        methodKeys: [],
      });

      const parentCtrl = getReactiveController(parent)!;
      const listener = vi.fn();
      parentCtrl.subscribe(listener);

      // Simulate what injectProperties does
      parentCtrl.linkDependency("childService", child);

      listener.mockClear();
      child.value = 42;
      expect(listener).toHaveBeenCalled();
    });

    it("linkDependency with new value replaces old subscription", () => {
      class DepService {
        val = 0;
      }

      class ConsumerService {
        x = 0;
      }

      const dep1 = enhanceService(new DepService(), {
        stateKeys: ["val"],
        methodKeys: [],
      });

      const dep2 = enhanceService(new DepService(), {
        stateKeys: ["val"],
        methodKeys: [],
      });

      const consumer = enhanceService(new ConsumerService(), {
        stateKeys: ["x"],
        methodKeys: [],
      });

      const ctrl = getReactiveController(consumer)!;
      const listener = vi.fn();
      ctrl.subscribe(listener);

      // Link dep1
      ctrl.linkDependency("dep", dep1);
      listener.mockClear();
      dep1.val = 1;
      expect(listener).toHaveBeenCalledTimes(1);

      // Re-link with dep2
      ctrl.linkDependency("dep", dep2);
      listener.mockClear();

      dep1.val = 2;
      expect(listener).not.toHaveBeenCalled();

      dep2.val = 3;
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("linkDependency on computed-only service (empty stateKeys) bumps version", () => {
      class ComputedService {
        get value() {
          return 42;
        }
      }

      class DepService {
        data = "hello";
      }

      const dep = enhanceService(new DepService(), {
        stateKeys: ["data"],
        methodKeys: [],
      });

      const computed = enhanceService(new ComputedService(), {
        stateKeys: [],
        methodKeys: [],
      });

      const ctrl = getReactiveController(computed)!;
      expect(ctrl.getVersion()).toBe(0);

      const listener = vi.fn();
      ctrl.subscribe(listener);

      ctrl.linkDependency("depService", dep);

      dep.data = "world";
      expect(listener).toHaveBeenCalled();
      expect(ctrl.getVersion()).toBeGreaterThan(0);
    });
  });

  // ===================================================================
  // #5 — Map / Set 作为 stateKey 字段
  // ===================================================================
  describe("Map and Set as stateKey fields", () => {
    it("Set containing reactive services triggers cascade after replacement", () => {
      class TagService {
        label = "tag";
      }

      class ContainerService {
        tagSet: Set<object> = new Set();
      }

      const tag = enhanceService(new TagService(), {
        stateKeys: ["label"],
        methodKeys: [],
      });

      const container = enhanceService(new ContainerService(), {
        stateKeys: ["tagSet"],
        methodKeys: [],
      });

      const ctrl = getReactiveController(container)!;
      const listener = vi.fn();
      ctrl.subscribe(listener);

      // Replace Set with one containing reactive service
      const newSet = new Set<object>();
      newSet.add(tag);
      container.tagSet = newSet;
      expect(listener).toHaveBeenCalled();

      // Child change should cascade to parent
      listener.mockClear();
      tag.label = "updated";
      expect(listener).toHaveBeenCalled();
    });

    it("Map containing reactive services triggers cascade after replacement", () => {
      class ValueService {
        amount = 10;
      }

      class RegistryService {
        registry: Map<string, object> = new Map();
      }

      const val = enhanceService(new ValueService(), {
        stateKeys: ["amount"],
        methodKeys: [],
      });

      const reg = enhanceService(new RegistryService(), {
        stateKeys: ["registry"],
        methodKeys: [],
      });

      const ctrl = getReactiveController(reg)!;
      const listener = vi.fn();
      ctrl.subscribe(listener);

      const newMap = new Map<string, object>();
      newMap.set("val", val);
      reg.registry = newMap;
      expect(listener).toHaveBeenCalled();

      listener.mockClear();
      val.amount = 99;
      expect(listener).toHaveBeenCalled();
    });
  });

  // ===================================================================
  // #6 — 循环依赖不会导致无限触发
  // ===================================================================
  describe("circular dependency protection", () => {
    it("mutual linkDependency does not cause infinite emitChange loop", () => {
      class ServiceA {
        valA = 0;
      }

      class ServiceB {
        valB = 0;
      }

      const a = enhanceService(new ServiceA(), {
        stateKeys: ["valA"],
        methodKeys: [],
      });

      const b = enhanceService(new ServiceB(), {
        stateKeys: ["valB"],
        methodKeys: [],
      });

      const ctrlA = getReactiveController(a)!;
      const ctrlB = getReactiveController(b)!;

      // Simulate circular dependency
      ctrlA.linkDependency("serviceB", b);
      ctrlB.linkDependency("serviceA", a);

      const listenerA = vi.fn();
      const listenerB = vi.fn();
      ctrlA.subscribe(listenerA);
      ctrlB.subscribe(listenerB);

      // Mutating A should NOT cause infinite loop
      a.valA = 1;
      expect(a.valA).toBe(1);

      // Both should have been notified (no infinite recursion)
      expect(listenerA).toHaveBeenCalled();
      expect(listenerB).toHaveBeenCalled();
    });

    it("self-referencing linkDependency is safe", () => {
      class SelfRefService {
        data = "x";
      }

      const service = enhanceService(new SelfRefService(), {
        stateKeys: ["data"],
        methodKeys: [],
      });

      const ctrl = getReactiveController(service)!;
      ctrl.linkDependency("self", service);

      const listener = vi.fn();
      ctrl.subscribe(listener);

      service.data = "y";
      expect(listener).toHaveBeenCalled();
      expect(service.data).toBe("y");
    });
  });

  // ===================================================================
  // #8 — dispose 级联完整性
  // ===================================================================
  describe("dispose cascading and cleanup", () => {
    it("dispose clears all nested subscriptions so child changes no longer propagate", () => {
      class Child {
        count = 0;
      }

      class Parent {
        children: object[] = [];
      }

      const c1 = enhanceService(new Child(), {
        stateKeys: ["count"],
        methodKeys: [],
      });

      const c2 = enhanceService(new Child(), {
        stateKeys: ["count"],
        methodKeys: [],
      });

      const parent = enhanceService(new Parent(), {
        stateKeys: ["children"],
        methodKeys: [],
      });

      parent.children = [c1, c2];
      const parentCtrl = getReactiveController(parent)!;
      const listener = vi.fn();
      parentCtrl.subscribe(listener);

      // Verify cascade before dispose
      listener.mockClear();
      c1.count = 10;
      expect(listener).toHaveBeenCalledTimes(1);

      // Dispose parent
      disposeReactiveService(parent);

      listener.mockClear();
      c1.count = 20;
      c2.count = 30;
      expect(listener).not.toHaveBeenCalled();

      // Children still functional
      expect(c1.count).toBe(20);
      expect(c2.count).toBe(30);
    });

    it("linkDependency after dispose is harmless", () => {
      class Dep {
        x = 0;
      }

      class Host {
        y = 0;
      }

      const dep = enhanceService(new Dep(), {
        stateKeys: ["x"],
        methodKeys: [],
      });

      const host = enhanceService(new Host(), {
        stateKeys: ["y"],
        methodKeys: [],
      });

      const ctrl = getReactiveController(host)!;
      disposeReactiveService(host);

      ctrl.linkDependency("dep", dep);

      const listener = vi.fn();
      ctrl.subscribe(listener);
      dep.x = 5;
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  // #10 — stateKey 字段初始值为 undefined / null
  // ===================================================================
  describe("undefined and null initial stateKey values", () => {
    it("handles undefined initial value and subsequent assignment", () => {
      class LazyService {
        data: { value: number } | undefined = undefined;
      }

      const service = enhanceService(new LazyService(), {
        stateKeys: ["data"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      expect(service.data).toBeUndefined();

      service.data = { value: 42 };
      expect(listener).toHaveBeenCalled();
      expect(service.data).toEqual({ value: 42 });

      listener.mockClear();
      service.data = undefined;
      expect(listener).toHaveBeenCalled();
      expect(service.data).toBeUndefined();
    });

    it("handles null initial value and subsequent assignment", () => {
      class NullableService {
        item: { name: string } | null = null;
      }

      const service = enhanceService(new NullableService(), {
        stateKeys: ["item"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      expect(service.item).toBeNull();

      service.item = { name: "test" };
      expect(listener).toHaveBeenCalled();
      expect(service.item!.name).toBe("test");
    });

    it("handles undefined → reactive service → undefined lifecycle", () => {
      class Inner {
        val = 1;
      }

      class Outer {
        inner: object | undefined = undefined;
      }

      const inner = enhanceService(new Inner(), {
        stateKeys: ["val"],
        methodKeys: [],
      });

      const outer = enhanceService(new Outer(), {
        stateKeys: ["inner"],
        methodKeys: [],
      });

      const ctrl = getReactiveController(outer)!;
      const listener = vi.fn();
      ctrl.subscribe(listener);

      // Assign reactive service
      outer.inner = inner;
      listener.mockClear();

      // Child cascade works
      inner.val = 99;
      expect(listener).toHaveBeenCalledTimes(1);

      // Set back to undefined — cascade stops
      outer.inner = undefined;
      listener.mockClear();
      inner.val = 200;
      expect(listener).not.toHaveBeenCalled();
    });
  });

  // ===================================================================
  // #11 — 继承链上的 stateKeys 和 getter
  // ===================================================================
  describe("inheritance chain stateKeys and getters", () => {
    it("stateKeys from both base and derived class work correctly", () => {
      class BaseService {
        baseCount = 0;

        get baseDoubled() {
          return this.baseCount * 2;
        }
      }

      class DerivedService extends BaseService {
        extra = "hello";

        get combined() {
          return `${this.extra}-${this.baseCount}`;
        }
      }

      const service = enhanceService(new DerivedService(), {
        stateKeys: ["baseCount", "extra"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const listener = vi.fn();
      controller.subscribe(listener);

      service.baseCount = 5;
      expect(listener).toHaveBeenCalled();
      expect(service.baseDoubled).toBe(10);

      listener.mockClear();
      service.extra = "world";
      expect(listener).toHaveBeenCalled();
      expect(service.combined).toBe("world-5");
    });

    it("inherited methods work correctly when bound", () => {
      class BaseService {
        count = 0;

        increment() {
          this.count += 1;
        }
      }

      class DerivedService extends BaseService {
        multiplier = 1;

        incrementBy(n: number) {
          this.count += n * this.multiplier;
        }
      }

      const service = enhanceService(new DerivedService(), {
        stateKeys: ["count", "multiplier"],
        methodKeys: ["increment", "incrementBy"],
      });

      const { increment, incrementBy } = service;
      increment();
      expect(service.count).toBe(1);

      service.multiplier = 3;
      incrementBy(2);
      expect(service.count).toBe(7);
    });
  });

  // ===================================================================
  // #12 — ref() 标记失败的边界情况
  // ===================================================================
  describe("ref() marking edge cases", () => {
    it("non-extensible object enhancement does not throw from ref()", () => {
      class SimpleService {
        value = 0;
      }

      const instance = new SimpleService();
      // enhanceService should handle ref() failure gracefully
      const service = enhanceService(instance, {
        stateKeys: ["value"],
        methodKeys: [],
      });

      expect(isReactiveService(service)).toBe(true);
      service.value = 10;
      expect(service.value).toBe(10);
    });
  });

  // ===================================================================
  // Snapshot 一致性
  // ===================================================================
  describe("snapshot consistency", () => {
    it("snapshot reflects latest state after multiple rapid mutations", () => {
      class RapidService {
        a = 0;
        b = 0;
      }

      const service = enhanceService(new RapidService(), {
        stateKeys: ["a", "b"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;

      service.a = 1;
      service.b = 2;
      service.a = 3;

      const snap = controller.getSnapshot() as any;
      expect(snap.a).toBe(3);
      expect(snap.b).toBe(2);
      expect(snap.__v).toBeGreaterThan(0);
    });

    it("each mutation creates a new snapshot identity", () => {
      class IdService {
        val = 0;
      }

      const service = enhanceService(new IdService(), {
        stateKeys: ["val"],
        methodKeys: [],
      });

      const controller = getReactiveController(service)!;
      const snap1 = controller.getSnapshot();

      service.val = 1;
      const snap2 = controller.getSnapshot();

      expect(snap1).not.toBe(snap2);
      expect((snap2 as any).__v).toBeGreaterThan((snap1 as any).__v);
    });
  });
});
