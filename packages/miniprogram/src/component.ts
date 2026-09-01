/**
 * component.ts
 *
 * defineSeparaComponent：为微信原生小程序 Component 提供 Separa 服务注入能力。
 */

import type { ServiceContainer, ServiceIdentifier } from "@separa/core";
import { subscribeServiceToSetData } from "./sync";
import type { InjectMap, SeparaPageInstance } from "./page";

export type { InjectMap };

// 微信小程序 Component 选项的宽松类型（避免 PropertyOption 约束冲突）
// 用户项目中应配合 @types/wechat-miniprogram 获得更强的类型检查
type AnyComponentOptions = Record<string, unknown> & {
  inject?: InjectMap;
  data?: Record<string, unknown>;
  lifetimes?: {
    attached?: (this: any) => void;
    detached?: (this: any) => void;
    [key: string]: ((this: any, ...args: any[]) => void) | undefined;
  };
  [key: string]: unknown;
};

/**
 * 定义一个接入了 Separa IoC 的小程序自定义组件。
 *
 * 行为与 defineSeparaPage 对称：
 * - 组件 `attached` 时创建子容器并订阅 Service 状态
 * - 组件 `detached` 时自动 dispose 子容器并解除订阅
 *
 * @param rootContainer 全局根容器或父级容器
 * @param options       包含 inject 和所有标准 Component 选项的配置对象
 *
 * @example
 * ```ts
 * // components/cart-summary/index.ts
 * import { defineSeparaComponent } from "@separa/miniprogram";
 * import { rootContainer } from "../../container";
 * import { CartService } from "../../services/cart.service";
 *
 * defineSeparaComponent(rootContainer, {
 *   inject: { cart: CartService },
 *   methods: {
 *     handleCheckout() {
 *       this.$services.cart.checkout();
 *     },
 *   },
 * });
 * ```
 */
export function defineSeparaComponent(
  rootContainer: ServiceContainer,
  options: AnyComponentOptions,
): void {
  const { inject = {}, ...componentOptions } = options;
  const injectEntries = Object.entries(inject as InjectMap);

  // 在初始 data 中为每个 Service 占位
  const initialData: Record<string, unknown> = { ...(componentOptions["data"] as Record<string, unknown> ?? {}) };
  for (const [alias] of injectEntries) {
    if (!(alias in initialData)) {
      initialData[alias] = {};
    }
  }

  // 合并用户传入的 lifetimes（保留用户自定义回调）
  const userLifetimes = (componentOptions["lifetimes"] as AnyComponentOptions["lifetimes"]) ?? {};

  // 使用 any 调用全局 Component()，避免 @types/wechat-miniprogram 的严格约束
  (Component as (options: any) => void)({
    ...componentOptions,
    data: initialData,
    lifetimes: {
      ...userLifetimes,

      attached(this: any) {
        const container: ServiceContainer =
          typeof (rootContainer as any).createScope === "function"
            ? (rootContainer as any).createScope()
            : rootContainer;

        this.$container = container;
        const services: Record<string, object> = {};
        this.$services = services;
        const unsubscribes: Array<() => void> = [];

        for (const [alias, token] of injectEntries) {
          const service = container.get(token as ServiceIdentifier<object>);
          services[alias] = service;
          const unsub = subscribeServiceToSetData(service, alias, this.setData.bind(this));
          unsubscribes.push(unsub);
        }

        this._separaUnsubs = unsubscribes;
        userLifetimes?.attached?.call(this);
      },

      detached(this: any) {
        const unsubscribes: Array<() => void> = this._separaUnsubs ?? [];
        for (const unsub of unsubscribes) unsub();
        this._separaUnsubs = [];

        const container: ServiceContainer | undefined = this.$container;
        if (container && container !== rootContainer) {
          void container.dispose();
        }
        this.$container = undefined;
        this.$services = {};

        userLifetimes?.detached?.call(this);
      },
    },
  });
}
