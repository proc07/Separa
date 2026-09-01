/**
 * @separa/taro/react
 *
 * Taro（React 模式）适配层：
 * - 完整转发 @separa/react 的所有 API
 * - 新增 useTaroPageScope：在 Taro 页面生命周期内自动管理子作用域容器
 */

export { SeparaProvider, useContainer, useService, useServiceState } from "@separa/react";

import { useEffect, useRef } from "react";
import type { ServiceContainer } from "@separa/core";

/** @internal 运行时调用 createScope 的辅助函数，对普通 ServiceContainer 也安全降级 */
function createChildScope(parent: ServiceContainer, scopeItems: object[]): ServiceContainer {
  if (typeof (parent as any).createScope === "function") {
    return scopeItems.length > 0
      ? (parent as any).createScope(...scopeItems)
      : (parent as any).createScope();
  }
  // 容器不支持 createScope 时回退到父容器（单测 stub 环境）
  return parent;
}

/**
 * 在 Taro React 页面或组件中创建一个子作用域容器。
 *
 * - 首次渲染时通过 rootContainer.createScope() 建立页面级子容器，可选传入实例级 scopeItems。
 * - 组件卸载（页面 onUnload / 组件销毁）时自动调用 dispose() 释放所有资源。
 *
 * @param rootContainer 根容器（全局单例）
 * @param scopeItems    可选：要绑定到子容器的领域对象实例
 *
 * @example
 * ```tsx
 * import { useTaroPageScope, useService } from "@separa/taro/react";
 * import { rootContainer } from "@/container";
 * import { CartService } from "@/services/cart.service";
 *
 * export default function CartPage() {
 *   const pageContainer = useTaroPageScope(rootContainer);
 *   const cart = useService(CartService);
 *   return <View>{cart.total}</View>;
 * }
 * ```
 */
export function useTaroPageScope(
  rootContainer: ServiceContainer,
  ...scopeItems: object[]
): ServiceContainer {
  // 使用 ref 保证子容器只在首次渲染时创建，后续渲染复用同一实例
  const containerRef = useRef<ServiceContainer | null>(null);

  if (containerRef.current === null) {
    containerRef.current = createChildScope(rootContainer, scopeItems);
  }

  useEffect(() => {
    // 捕获当前 ref 值，避免异步 dispose 拿到更新后的 ref
    const container = containerRef.current;
    return () => {
      containerRef.current = null;
      // dispose 可能是异步的，此处触发即可，无需等待
      void container?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return containerRef.current;
}
