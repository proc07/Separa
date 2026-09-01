/**
 * @separa/miniprogram
 *
 * 微信原生小程序适配层，提供 Separa IoC 与小程序 Page/Component 生命周期的完整集成。
 *
 * ## 使用方式
 *
 * ### 1. 初始化根容器（app.ts）
 *
 * ```ts
 * import "reflect-metadata";
 * import { SeparaContainer } from "@separa/ioc-inversify";
 * import { serviceDefinitions } from "virtual:separa/registry"; // 需配置构建插件
 * // 或手动注册（不使用构建插件时）：
 * // import { defineDecoratedService } from "@separa/core";
 * // const serviceDefinitions = [defineDecoratedService(CartService, ["total", "items"])];
 *
 * export const rootContainer = new SeparaContainer({ definitions: serviceDefinitions });
 *
 * App({ onLaunch() {} });
 * ```
 *
 * ### 2. 在 Page 中使用（pages/cart/index.ts）
 *
 * ```ts
 * import { defineSeparaPage } from "@separa/miniprogram";
 * import { rootContainer } from "../../app";
 * import { CartService } from "../../services/cart.service";
 *
 * defineSeparaPage(rootContainer, {
 *   inject: { cart: CartService },
 *   onLoad() {
 *     console.log(this.data.cart.total); // 初始状态
 *   },
 * });
 * ```
 *
 * ### 3. 在 WXML 中直接绑定
 *
 * ```xml
 * <!-- pages/cart/index.wxml -->
 * <view>合计：{{cart.total}}</view>
 * <button bindtap="handleCheckout">结算</button>
 * ```
 *
 * ### 4. 在 Component 中使用（components/cart-item/index.ts）
 *
 * ```ts
 * import { defineSeparaComponent } from "@separa/miniprogram";
 * import { rootContainer } from "../../app";
 * import { CartService } from "../../services/cart.service";
 *
 * defineSeparaComponent(rootContainer, {
 *   inject: { cart: CartService },
 *   methods: {
 *     addItem() { this.$services.cart.addItem({ id: "001", price: 99, quantity: 1 }); },
 *   },
 * });
 * ```
 *
 * ## 构建配置
 *
 * ### 方案 A：使用 webpack 构建管道（推荐）
 * 在 webpack.config.js 中添加：
 * ```js
 * const SeparaPlugin = require("@separa/plugin/webpack");
 * module.exports = { plugins: [new SeparaPlugin()] };
 * ```
 *
 * ### 方案 B：仅使用 tsc（无 AOT 插件）
 * 1. 在 tsconfig.json 中开启 `"emitDecoratorMetadata": true`
 * 2. 使用 `defineDecoratedService` 手动注册服务
 * 3. 在微信开发者工具中点击"构建 npm"
 */

export { defineSeparaPage } from "./page";
export { defineSeparaComponent } from "./component";
export { subscribeServiceToSetData, extractServiceState } from "./sync";
export type { InjectMap, SeparaPageInstance } from "./page";
