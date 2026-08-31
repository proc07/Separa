import { proxy, ref, snapshot, subscribe } from "valtio/vanilla";
import type { EnhanceOptions } from "./types";

/** UI 适配器和容器用于观察、快照读取及释放响应式 Service 的运行时控制面。 */
export interface ReactiveServiceController {
  readonly stateKeys: readonly PropertyKey[];
  getVersion(): number;
  getSnapshot(): object;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

// 同一实例只增强一次；WeakMap 同时保证控制器不会延长实例生命周期。
const controllers = new WeakMap<object, ReactiveServiceController>();

/** 递归提取目标结构中的所有响应式子服务实例（支持数组、对象、Set、Map，带防环保护） */
function collectNestedReactiveServices(target: unknown, seen = new Set<object>()): object[] {
  if (!target || typeof target !== "object") return [];
  if (seen.has(target)) return [];
  seen.add(target);

  const results: object[] = [];
  if (controllers.has(target)) {
    results.push(target);
  }

  if (Array.isArray(target)) {
    for (const item of target) {
      results.push(...collectNestedReactiveServices(item, seen));
    }
  } else if (target instanceof Set || target instanceof Map) {
    for (const item of target.values()) {
      results.push(...collectNestedReactiveServices(item, seen));
    }
  } else if (Object.prototype.toString.call(target) === "[object Object]") {
    for (const key of Object.keys(target)) {
      results.push(...collectNestedReactiveServices((target as Record<string, unknown>)[key], seen));
    }
  }

  return results;
}

/**
 * 在不改变业务类公开类型的前提下，为实例安装隐藏的 Valtio 状态和稳定方法。
 * 支持嵌套子服务的响应式自动级联冒泡（Deep Nested Cascade Reactivity）。
 */
export function enhanceService<T extends object>(instance: T, options: EnhanceOptions<T>): T {
  if (controllers.has(instance)) return instance;

  // 将服务实例本身标记为 ref，防止作为子对象嵌套到其他服务状态时被重复代理或深克隆报错
  try {
    ref(instance);
  } catch {
    // 忽略不可扩展对象的标记失败
  }

  const stateKeys = [...new Set(options.stateKeys as readonly PropertyKey[])];
  const state = proxy<Record<PropertyKey, unknown>>({});
  const nestedSubs = new Map<PropertyKey, Set<() => void>>();

  let version = 0;
  let currentSnapshot: object = snapshot(state);
  const listeners = new Set<() => void>();
  let disposed = false;

  const emitChange = () => {
    if (disposed) return;
    version += 1;
    try {
      currentSnapshot = snapshot(state);
    } catch {
      currentSnapshot = { ...state };
    }
    for (const listener of [...listeners]) listener();
  };

  const syncNestedSubscriptions = (key: PropertyKey, value: unknown) => {
    const oldSubs = nestedSubs.get(key);
    if (oldSubs) {
      for (const unbind of oldSubs) unbind();
      oldSubs.clear();
    }

    if (disposed) return;

    const children = collectNestedReactiveServices(value);
    if (!children.length) return;

    const currentSubs = new Set<() => void>();
    for (const child of children) {
      if (child === instance) continue;
      const childController = controllers.get(child);
      if (childController) {
        const unbind = childController.subscribe(emitChange);
        currentSubs.add(unbind);
      }
    }
    nestedSubs.set(key, currentSubs);
  };

  // 将公开字段重定向到隐藏 Proxy，并自动接入嵌套级联响应式。
  for (const key of stateKeys) {
    const initialValue = instance[key as keyof T];
    state[key] = initialValue;
    syncNestedSubscriptions(key, initialValue);

    Object.defineProperty(instance, key, {
      configurable: true,
      enumerable: true,
      get: () => state[key],
      set: (value: unknown) => {
        state[key] = value;
        syncNestedSubscriptions(key, value);
      },
    });
  }

  // 方法只绑定一次，确保从 Service 解构方法后 this 仍指向原实例。
  for (const key of new Set(options.methodKeys as readonly PropertyKey[])) {
    const method = instance[key as keyof T];
    if (typeof method === "function") {
      Object.defineProperty(instance, key, {
        value: method.bind(instance),
        configurable: true,
        writable: true,
      });
    }
  }

  // 同步订阅使一次业务字段变更在返回 UI 前即可生成新版本和快照。
  const unsubscribe = subscribe(state, emitChange, true);

  const controller: ReactiveServiceController = {
    stateKeys,
    getVersion: () => version,
    getSnapshot: () => currentSnapshot,
    subscribe(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const subs of nestedSubs.values()) {
        for (const unbind of subs) unbind();
        subs.clear();
      }
      nestedSubs.clear();
      listeners.clear();
      unsubscribe();
    },
  };

  controllers.set(instance, controller);
  return instance;
}

/** 获取透传底层订阅 Service 所需的控制器；普通对象返回 undefined */
export function getReactiveController(service: object): ReactiveServiceController | undefined {
  return controllers.get(service);
}

/** 判断对象是否已经完成响应式增强。 */
export function isReactiveService(service: object): boolean {
  return controllers.has(service);
}

/** 供容器生命周期统一释放响应式资源。重复调用是安全的。 */
export function disposeReactiveService(service: object): void {
  controllers.get(service)?.dispose();
}
