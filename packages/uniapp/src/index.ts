/**
 * @separa/uniapp
 *
 * uni-app（Vue 3 模式）适配层：
 * - 完整转发 @separa/vue 的所有 API
 * - 新增 useSeparaPageScope：在 uni-app 页面生命周期内自动管理子作用域容器
 * - 新增 useSeparaComponentScope：在 uni-app 组件生命周期内自动管理子作用域容器
 *
 * 构建配置（vite 模式）：
 * ```ts
 * // vite.config.ts
 * import { separa } from "@separa/plugin";
 * export default defineConfig({ plugins: [uni(), separa()] });
 * ```
 *
 * 构建配置（webpack 模式 / vue-cli-plugin-uni）：
 * ```js
 * // vue.config.js
 * const SeparaPlugin = require("@separa/plugin/webpack");
 * module.exports = { configureWebpack: { plugins: [new SeparaPlugin()] } };
 * ```
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
 * 在 uni-app 页面的 `<script setup>` 中创建一个页面级子作用域容器。
 *
 * uni-app 页面是 Vue 3 组件，此函数通过 `onUnmounted` 钩子（页面销毁时触发）
 * 自动 dispose 子容器，释放所有响应式订阅与服务实例。
 *
 * @param rootContainer 根容器（全局单例，通常在 App.vue 中初始化）
 * @param scopeItems    可选：要绑定到子容器的领域对象实例（如商品行、图元实体）
 *
 * @example
 * ```vue
 * <!-- pages/cart/index.vue -->
 * <script setup lang="ts">
 * import { useSeparaPageScope, useService, provideContainer } from "@separa/uniapp";
 * import { rootContainer } from "@/container";
 * import { CartService } from "@/services/cart.service";
 *
 * const pageContainer = useSeparaPageScope(rootContainer);
 * provideContainer(pageContainer);
 * const cart = useService(CartService);
 * </script>
 *
 * <template>
 *   <view>合计：{{ cart.total }}</view>
 * </template>
 * ```
 */
export function useSeparaPageScope(
  rootContainer: ServiceContainer,
  ...scopeItems: object[]
): ServiceContainer {
  const container = createChildScope(rootContainer, scopeItems);
  onUnmounted(() => void container.dispose());
  return container;
}

/**
 * 在 uni-app 自定义组件的 `<script setup>` 中创建一个组件级子作用域容器。
 *
 * 语义与 useSeparaPageScope 完全一致，仅提供更清晰的命名以区分使用场景。
 *
 * @param rootContainer 根容器或父页面容器
 * @param scopeItems    可选：要绑定到子容器的领域对象实例
 */
export function useSeparaComponentScope(
  rootContainer: ServiceContainer,
  ...scopeItems: object[]
): ServiceContainer {
  return useSeparaPageScope(rootContainer, ...scopeItems);
}
