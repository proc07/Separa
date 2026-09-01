import { effectScope, getCurrentScope, inject, onScopeDispose, provide, readonly, shallowRef, triggerRef, type App, type InjectionKey, type Ref } from "vue";
import { getReactiveController, getServiceMetadata } from "@separa/core";
import type { ServiceContainer, ServiceIdentifier } from "@separa/core";

export const containerKey: InjectionKey<ServiceContainer> = Symbol("@separa/vue/container");

/** 获取当前 Vue 上下文中的 Separa 容器。 */
export function useContainer(): ServiceContainer {
  const container = inject(containerKey);
  if (!container) throw new Error("useService() requires createSeparaPlugin(container) to be installed.");
  return container;
}

/** 在当前组件及其子树中绑定一个（子）容器。 */
export function provideContainer(container: ServiceContainer): void {
  provide(containerKey, container);
}

/** 创建将 Separa 容器注入 Vue 应用树的插件。 */
export function createSeparaPlugin(container: ServiceContainer) {
  return {
    install(app: App): void {
      app.provide(containerKey, container);
    },
  };
}

type Method = (...args: never[]) => unknown;
// 方法保持原函数类型，状态和 Getter 则暴露为只读 Ref，阻止视图绕过业务方法写状态。
type ServiceFacade<T extends object> = {
  readonly [K in keyof T]: T[K] extends Method ? T[K] : Readonly<Ref<T[K]>>;
};

/** 将 Service 转换为适合 Vue 模板和 setup() 使用的只读 Ref Facade。 */
export function useService<T extends object>(token: ServiceIdentifier<T>): ServiceFacade<T> {
  const container = useContainer();

  const service = container.get(token);
  const controller = getReactiveController(service);
  if (!controller) return service as ServiceFacade<T>;

  const facade: Partial<Record<keyof T, unknown>> = {};
  const reactiveKeys = new Set(controller.stateKeys as (keyof T)[]);
  const values = new Map<keyof T, Ref<T[keyof T]>>();

  // 读取装饰器元数据中标记的 nonReactiveKeys（@Autowired / @Inject / @NonReactive 字段）
  // 这些字段的引用不会变化，不需要包装为 Ref，直接暴露即可
  const meta = getServiceMetadata(service.constructor as any);
  const nonReactiveKeys = meta?.nonReactiveKeys ?? new Set<PropertyKey>();

  // 实例字段包含绑定后的方法；原型遍历额外发现继承方法和派生 Getter。
  for (const key of Reflect.ownKeys(service) as (keyof T)[]) {
    if (key === "constructor") continue;
    if (typeof service[key] === "function") {
      facade[key] = service[key];
    } else if (nonReactiveKeys.has(key as PropertyKey)) {
      // @Autowired / @Inject / @NonReactive 标记的属性，直接暴露引用，不包装为 Ref
      facade[key] = service[key];
    } else {
      reactiveKeys.add(key);
    }
  }
  let prototype = Object.getPrototypeOf(service) as object | null;
  while (prototype && prototype !== Object.prototype) {
    for (const key of Reflect.ownKeys(prototype) as (keyof T)[]) {
      if (key === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      if (typeof descriptor?.get === "function") reactiveKeys.add(key);
      else if (typeof service[key] === "function") facade[key] = service[key];
    }
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }

  for (const key of reactiveKeys) {
    const value = shallowRef(service[key]) as Ref<T[keyof T]>;
    values.set(key, value);
    facade[key] = readonly(value);
  }

  const stop = controller.subscribe(() => {
    // shallowRef 避免 Vue 再次深代理 Valtio 快照；Core 是唯一深层响应式来源。
    for (const [key, value] of values) {
      value.value = service[key];
      triggerRef(value);
    }
  });
  // 在组件 effect scope 中自动解绑；独立作用域可通过 runWithServiceScope 管理。
  if (getCurrentScope()) onScopeDispose(stop);

  return facade as ServiceFacade<T>;
}
