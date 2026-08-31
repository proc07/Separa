import { describe, it, expect, vi } from "vitest";
import {
  enhanceService,
  getReactiveController,
  isReactiveService,
  disposeReactiveService,
} from "@separa/core";

describe("@separa/core - state-enhancer", () => {
  it("wraps state in Valtio proxy and binds methods to reactive instance", () => {
    class StateTestService {
      name = "Alice";
      age = 30;
      nonReactive = "ignore";

      get description() {
        return `${this.name} is ${this.age}`;
      }

      birthday() {
        this.age += 1;
      }

      rename(newName: string) {
        this.name = newName;
      }
    }

    const unenhanced = new StateTestService();
    expect(isReactiveService(unenhanced)).toBe(false);
    expect(getReactiveController(unenhanced)).toBeUndefined();

    const raw = new StateTestService();
    const service = enhanceService(raw, {
      stateKeys: ["name", "age"],
      methodKeys: ["birthday", "rename"],
    });

    expect(isReactiveService(service)).toBe(true);
    const controller = getReactiveController(service);
    expect(controller).toBeDefined();
    expect(controller?.stateKeys).toEqual(["name", "age"]);
    expect(controller?.getVersion()).toBe(0);

    // Re-enhancing same instance returns same instance without duplicate wrapping
    expect(enhanceService(service, { stateKeys: ["name"], methodKeys: [] })).toBe(service);

    // Getter access works through proxy
    expect(service.description).toBe("Alice is 30");

    // Subscription notification on state mutation
    const listener = vi.fn();
    const unsubscribe = controller!.subscribe(listener);

    // Method invocation updates state
    const { birthday, rename } = service;
    birthday();
    expect(service.age).toBe(31);
    expect((controller!.getSnapshot() as any).age).toBe(31);
    expect(controller!.getVersion()).toBe(1);
    expect(listener).toHaveBeenCalled();

    rename("Bob");
    expect(service.name).toBe("Bob");
    expect(service.description).toBe("Bob is 31");

    // Multiple subscribers
    const listener2 = vi.fn();
    const unsubscribe2 = controller!.subscribe(listener2);
    service.age = 32;
    expect(listener2).toHaveBeenCalled();

    unsubscribe();
    unsubscribe2();

    // Modifying non-reactive property does not notify controller listeners
    listener.mockClear();
    service.nonReactive = "changed";
    expect(listener).not.toHaveBeenCalled();

    // Disposal disconnects subscription and prevents further listener additions
    disposeReactiveService(service);
    // Calling disposeReactiveService multiple times is safe
    disposeReactiveService(service);

    const postDisposeListener = vi.fn();
    controller!.subscribe(postDisposeListener);
    service.age = 40;
    expect(postDisposeListener).not.toHaveBeenCalled();
  });

  it("handles empty stateKeys and methodKeys gracefully", () => {
    class EmptyService {
      sayHello() {
        return "hello";
      }
    }
    const service = enhanceService(new EmptyService(), {
      stateKeys: [],
      methodKeys: ["sayHello"],
    });
    expect(service.sayHello()).toBe("hello");
    expect(isReactiveService(service)).toBe(true);
  });

  it("automatically cascades reactive changes from nested services to parent service", () => {
    class SubItem {
      qty = 1;
      setQty(val: number) {
        this.qty = val;
      }
    }

    class ParentStore {
      items: { sub: SubItem }[] = [];
      addItem(sub: SubItem) {
        this.items = [...this.items, { sub }];
      }
    }

    const sub1 = enhanceService(new SubItem(), {
      stateKeys: ["qty"],
      methodKeys: ["setQty"],
    });

    const parent = enhanceService(new ParentStore(), {
      stateKeys: ["items"],
      methodKeys: ["addItem"],
    });

    const parentListener = vi.fn();
    const parentController = getReactiveController(parent)!;
    parentController.subscribe(parentListener);

    // 1. Add sub1 to parent
    parent.addItem(sub1);
    expect(parentListener).toHaveBeenCalledTimes(1);

    // 2. Mutating sub1 directly automatically triggers parent listener!
    parentListener.mockClear();
    sub1.setQty(5);
    expect(sub1.qty).toBe(5);
    expect(parentListener).toHaveBeenCalledTimes(1);
    expect(parentController.getVersion()).toBeGreaterThan(0);

    // 3. Adding another sub item
    const sub2 = enhanceService(new SubItem(), {
      stateKeys: ["qty"],
      methodKeys: ["setQty"],
    });
    parent.addItem(sub2);
    parentListener.mockClear();

    sub2.setQty(10);
    expect(parentListener).toHaveBeenCalledTimes(1);

    // 4. Removing sub1 stops notifications from sub1 to parent
    parent.items = parent.items.filter((entry) => entry.sub !== sub1);
    parentListener.mockClear();

    sub1.setQty(99);
    expect(parentListener).not.toHaveBeenCalled();

    // But sub2 still notifies parent
    sub2.setQty(20);
    expect(parentListener).toHaveBeenCalledTimes(1);

    // 5. Clean parent disposal
    disposeReactiveService(parent);
    parentListener.mockClear();
    sub2.setQty(30);
    expect(parentListener).not.toHaveBeenCalled();
  });
});
