/**
 * @separa/taro/vue
 *
 * Taro（Vue 模式）适配层：
 * - 完整转发 @separa/vue 的所有 API
 * - 新增 useTaroPageScope：在 Taro 页面生命周期内自动管理子作用域容器
 */

export { containerKey, createSeparaPlugin, provideContainer, useContainer, useService } from "@separa/vue";

import { onUnmounted } from "vue";
import type { ServiceContainer } from "@separa/core";

/** @internal 运行时调用 createScope 的辅助函数，对普通 ServiceContainer 也安全降级 */
function createChildScope(parent: ServiceContainer, scopeItems: object[]): ServiceContainer {
  if (typeof (parent as any).createScope === "function") {
    return scopeItems.length > 0
      ? (parent as any).createScope(...scopeItems)
      : (parent as any).createScope();
  }
  return parent;
}

/**
 * 在 Taro Vue 页面或组件的 setup() 中创建一个子作用域容器。
 *
 * - 立即通过 rootContainer.createScope() 建立页面级子容器，可选传入实例级 scopeItems。
 * - 组件/页面卸载时自动调用 dispose() 释放所有资源（通过 onUnmounted）。
 *
 * @param rootContainer 根容器（全局单例）
 * @param scopeItems    可选：要绑定到子容器的领域对象实例
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useTaroPageScope, useService, provideContainer } from "@separa/taro/vue";
 * import { rootContainer } from "@/container";
 * import { CartService } from "@/services/cart.service";
 *
 * const pageContainer = useTaroPageScope(rootContainer);
 * provideContainer(pageContainer);
 * const cart = useService(CartService);
 * </script>
 * ```
 */
export function useTaroPageScope(
  rootContainer: ServiceContainer,
  ...scopeItems: object[]
): ServiceContainer {
  const container = createChildScope(rootContainer, scopeItems);

  onUnmounted(() => {
    void container.dispose();
  });

  return container;
}
