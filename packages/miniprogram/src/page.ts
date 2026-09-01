/**
 * page.ts
 *
 * defineSeparaPage：为微信原生小程序 Page 提供 Separa 服务注入能力。
 */

import type { ServiceContainer, ServiceIdentifier } from "@separa/core";
import { subscribeServiceToSetData } from "./sync";

/**
 * 描述 Service 注入声明。
 * - key：在 this.data 和 WXML 中暴露的字段名
 * - value：ServiceIdentifier（类构造函数或 Token）
 */
export type InjectMap = Record<string, ServiceIdentifier<object>>;

/**
 * 增强后的 Page 实例上额外挂载的属性。
 * 在 Page 方法中可通过 this 访问。
 */
export interface SeparaPageInstance {
  /** 当前页面的子作用域容器 */
  readonly $container: ServiceContainer;
  /** 已解析的 Service 实例映射，key 与 inject 中定义的别名一致 */
  readonly $services: Record<string, object>;
}

// 微信小程序 Page 选项的宽松类型（用户项目中配合 @types/wechat-miniprogram 获得完整类型检查）
type AnyPageOptions = Record<string, unknown> & {
  inject?: InjectMap;
  data?: Record<string, unknown>;
  onLoad?: (this: any, query: Record<string, string | undefined>) => void;
  onUnload?: (this: any) => void;
  [key: string]: unknown;
};

/**
 * 定义一个接入了 Separa IoC 的小程序 Page。
 *
 * 使用方式：
 * 1. 调用此函数代替原生 `Page()` 调用
 * 2. 在 inject 中声明需要的 Service
 * 3. 在 WXML 中直接通过别名访问 Service 状态，如 `{{cart.total}}`
 * 4. 在 Page 方法中通过 `this.$services.cart.addItem(...)` 调用 Service 方法
 *
 * @param rootContainer 全局根容器（或父级容器）
 * @param options       包含 inject 和所有标准 Page 选项的配置对象
 *
 * @example
 * ```ts
 * // pages/cart/index.ts
 * import { defineSeparaPage } from "@separa/miniprogram";
 * import { rootContainer } from "../../container";
 * import { CartService } from "../../services/cart.service";
 *
 * defineSeparaPage(rootContainer, {
 *   inject: { cart: CartService },
 *   onLoad(query) {
 *     // this.$services.cart → CartService 实例
 *     // this.data.cart     → { total: 0, items: [] } 自动同步
 *   },
 *   onUnload() {
 *     // 子容器与响应式订阅已由框架自动 dispose，无需手动处理
 *   },
 * });
 * ```
 */
export function defineSeparaPage(
  rootContainer: ServiceContainer,
  options: AnyPageOptions,
): void {
  const { inject = {}, ...pageOptions } = options;
  const injectEntries = Object.entries(inject as InjectMap);

  // 为每个注入的 Service 在初始 data 中占位（空对象，后续由 setData 填充）
  const initialData: Record<string, unknown> = { ...(pageOptions["data"] as Record<string, unknown> ?? {}) };
  for (const [alias] of injectEntries) {
    if (!(alias in initialData)) {
      initialData[alias] = {};
    }
  }

  // 使用 any 调用全局 Page()，避免 @types/wechat-miniprogram 的严格约束
  (Page as (options: any) => void)({
    ...pageOptions,
    data: initialData,

    onLoad(this: any, query: Record<string, string | undefined>) {
      // 创建页面级子容器（继承全局单例服务，隔离页面私有服务）
      const container: ServiceContainer =
        typeof (rootContainer as any).createScope === "function"
          ? (rootContainer as any).createScope()
          : rootContainer;

      this.$container = container;
      const services: Record<string, object> = {};
      this.$services = services;
      const unsubscribes: Array<() => void> = [];

      for (const [alias, token] of injectEntries) {
        const service = container.get(token);
        services[alias] = service;
        const unsub = subscribeServiceToSetData(service, alias, this.setData.bind(this));
        unsubscribes.push(unsub);
      }

      this._separaUnsubs = unsubscribes;
      pageOptions["onLoad"]?.call(this, query);
    },

    onUnload(this: any) {
      // 先解除所有响应式订阅
      const unsubscribes: Array<() => void> = this._separaUnsubs ?? [];
      for (const unsub of unsubscribes) unsub();
      this._separaUnsubs = [];

      // 销毁子容器（调用每个 Service 的 onDestroy/dispose 并释放响应式资源）
      const container: ServiceContainer | undefined = this.$container;
      if (container && container !== rootContainer) {
        void container.dispose();
      }
      this.$container = undefined;
      this.$services = {};

      pageOptions["onUnload"]?.call(this);
    },
  });
}
