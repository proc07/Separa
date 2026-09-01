/**
 * sync.ts
 *
 * Service 状态 → setData() 同步桥接层。
 * 负责从 Service 实例提取响应式状态并推送到小程序视图层。
 */

import { getReactiveController } from "@separa/core";

/**
 * 从 Service 实例提取当前的响应式状态字段值。
 * 只提取由 enhanceService 记录的 stateKeys 和原型链上的 getter。
 */
export function extractServiceState(service: object): Record<string, unknown> {
  const controller = getReactiveController(service);
  const result: Record<string, unknown> = {};

  if (controller) {
    // 从 controller 拿到 stateKeys（由 AOT 插件或 enhanceService 确定）
    for (const key of controller.stateKeys) {
      result[key as string] = (service as Record<PropertyKey, unknown>)[key];
    }
  }

  // 补充原型链上的 getter（computed 属性）
  let proto = Object.getPrototypeOf(service) as object | null;
  while (proto && proto !== Object.prototype) {
    for (const key of Reflect.ownKeys(proto)) {
      if (key === "constructor" || key in result) continue;
      const descriptor = Object.getOwnPropertyDescriptor(proto, key);
      if (typeof descriptor?.get === "function") {
        try {
          result[key as string] = (service as Record<PropertyKey, unknown>)[key];
        } catch {
          // getter 访问失败时忽略
        }
      }
    }
    proto = Object.getPrototypeOf(proto) as object | null;
  }

  return result;
}

export type SetDataFn = (data: Record<string, unknown>, callback?: () => void) => void;

/**
 * 将一个 Service 的状态订阅到 setData。
 * 返回取消订阅的清理函数。
 *
 * @param service   已注册到容器并完成响应式增强的服务实例
 * @param alias     在小程序 data 中对应的字段名（如 "cart" → this.data.cart）
 * @param setData   来自 Page/Component 实例的 setData 方法
 */
export function subscribeServiceToSetData(
  service: object,
  alias: string,
  setData: SetDataFn,
): () => void {
  const controller = getReactiveController(service);

  // 同步初始状态
  setData({ [alias]: extractServiceState(service) });

  if (!controller) {
    // 非响应式服务：只做初始同步，无需订阅
    return () => undefined;
  }

  // 订阅后续变更
  return controller.subscribe(() => {
    setData({ [alias]: extractServiceState(service) });
  });
}
