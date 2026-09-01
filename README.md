# Separa 🚀

> **A Next-Generation Compile-Time IoC & Reactive Domain Architecture for React & Vue.**
> 
> *Separate domain logic from UI components with Spring-like `@Autowired()`, zero-boilerplate Vite AOT dependency injection, and hierarchical scoped containers.*

---

## 🌟 Features / 核心特性

- 🎯 **100% 领域与 UI 解耦（Separation of Concerns）**：业务逻辑编写为纯粹的 TypeScript 类（Services），React 与 Vue 组件只负责纯渲染，业务核心 100% 无缝复用。
- 🍃 **Spring 风格 `@Autowired()` 属性注入**：基于 TypeScript 装饰器与类型元数据，零样板参数、零显式 Token，像写 Java Spring Boot 一样自然优雅。
- 🌳 **父子作用域与动态容器（Hierarchical Scoped DI）**：通过 `rootContainer.createScope(item)` 轻松挂载局部领域对象（如多商品行、多图元实体），自动继承全局单例（汇率、税率、日志），支持精准生命周期销毁与内存释放（`dispose()`）。
- ⚡ **编译期 AOT 静态扫描（Vite Plugin）**：
  - 自动扫描全项目 `@Service`，零手动配置构建静态依赖图；
  - 构建期精确排查循环依赖、接口缺失与多实现歧义；
  - 智能 Tree-shaking：基于入口文件进行可达性分析，未使用的 Service 自动剔除。
- 🔌 **接口与契约驱动（Interface-Based DI）**：支持基于 TypeScript `interface` 的多实现装配、`@Qualifier()` 命名限定符以及多环境 Profile 切换（`dev`/`prod`/`mock`）。
- 🔄 **双向细粒度响应式支持**：
  - **React**：内置极速 Proxy 属性级订阅，仅在消费的字段变化时精准局部重渲染；
  - **Vue 3**：无缝桥接 Vue 3 响应式系统（`ref`/`computed`/`reactive`）。

---

## 📦 Packages / 模块组织

Separa 采用 Monorepo 架构，职责分明：

| 包名 | 职责描述 |
| :--- | :--- |
| **`@separa/core`** | 核心装饰器（`@Service`, `@Autowired`, `@Inject`, `@Qualifier`）、Token 体系、响应式增强器 |
| **`@separa/ioc-inversify`** | 现代 IoC 容器引擎、父子作用域（`createScope`）、动态模块与生命周期管理 |
| **`@separa/vite-plugin`** | Vite 编译期 AOT 依赖分析插件、虚拟注册表生成、静态架构校验 |
| **`@separa/react`** | React 适配层（`<SeparaProvider />`, `useService()`, `useContainer()`） |
| **`@separa/vue`** | Vue 3 适配层（`SeparaPlugin`, `useService()`, `useContainer()`） |

---

## 💡 Quick Start / 快速上手

### 1. 配置 Vite 插件

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // 或 vue()
import { separa } from "@separa/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    separa({
      // 可选：指定静态分析扫描入口与规则
      include: ["src/**/*.ts", "src/**/*.tsx"],
    }),
  ],
});
```

### 2. 编写纯 TypeScript Service（业务服务）

```ts
// services/currency.service.ts
import { Autowired, Service } from "@separa/core";
import { LogService } from "./log.service";

@Service({ scope: "singleton" })
export class CurrencyService {
  currentCurrency: "CNY" | "USD" = "CNY";

  // 🚀 Spring 风格自动装配：自动根据 TS 类型反射注入 LogService
  @Autowired()
  private logService!: LogService;

  setCurrency(currency: "CNY" | "USD") {
    this.currentCurrency = currency;
    this.logService?.log(`Currency changed to ${currency}`);
  }

  format(amountCNY: number): string {
    const rate = this.currentCurrency === "USD" ? 0.14 : 1;
    const symbol = this.currentCurrency === "USD" ? "$" : "¥";
    return `${symbol}${(amountCNY * rate).toFixed(2)}`;
  }
}
```

### 3. 在 React 中消费

```tsx
// App.tsx
import React from "react";
import { useService } from "@separa/react";
import { CurrencyService } from "./services/currency.service";

export function App() {
  const currency = useService(CurrencyService);

  return (
    <div>
      <p>当前货币: {currency.currentCurrency}</p>
      <p>格式化金额: {currency.format(100)}</p>
      <button onClick={() => currency.setCurrency("USD")}>切换为 USD</button>
    </div>
  );
}
```

### 4. 在 Vue 3 中消费（逻辑完全一致）

```vue
<!-- App.vue -->
<script setup lang="ts">
import { useService } from "@separa/vue";
import { CurrencyService } from "./services/currency.service";

const currency = useService(CurrencyService);
const { currentCurrency, format, setCurrency } = currency;
</script>

<template>
  <div>
    <p>当前货币: {{ currentCurrency }}</p>
    <p>格式化金额: {{ format(100) }}</p>
    <button @click="setCurrency('USD')">切换为 USD</button>
  </div>
</template>
```

---

## 🌲 Hierarchical Scoped DI / 父子作用域设计

当构建复杂领域（例如电商购物车的每一行商品、绘图画板的每一个图形节点）时，每个子实体需要独立的生命周期与状态，同时又要共享根容器的全局服务（税率、汇率、审计日志）。

Separa 提供了极其直观的 **Zero-Token 实例级 Scope 挂载**：

```ts
// 1. 商品实体（普通领域类，仅接收业务数据）
export class ItemService {
  id: string;
  price: number;
  quantity: number;

  @Autowired()
  private logService!: CartLogService; // 自动从父容器注入全局服务

  constructor(props: { id: string; price: number; quantity: number }) {
    this.id = props.id;
    this.price = props.price;
    this.quantity = props.quantity;
  }
}

// 2. 算价引擎（动态注入当前行的 item，并从全局父容器继承 tax 和 currency）
@Service({ scope: "transient" })
export class ItemCalculatorService {
  @Autowired()
  readonly item!: ItemService;

  @Autowired()
  readonly taxService!: TaxService;

  @Autowired()
  readonly currencyService!: CurrencyService;

  get total(): number {
    return this.item.price * this.item.quantity * (1 + this.taxService.rate);
  }
}

// 3. 创建子作用域（零 Token，零中括号，极简传参）
const item = new ItemService({ id: "item-1", price: 8999, quantity: 1 });
const childContainer = rootContainer.createScope(item);

// 4. 解析算价引擎（自动拼装局部 item 与全局 TaxService/CurrencyService）
const calculator = childContainer.get(ItemCalculatorService);
console.log(calculator.total);

// 5. 销毁作用域（一键释放内存与响应式监听）
await childContainer.dispose();
```

---

## 🎮 Examples / 丰富示例工程

仓库内包含 3 组各具代表性的跨框架示例应用（每个业务领域均提供 React 与 Vue 1:1 对等实现）：

| 示例工程 | 业务领域 | 核心亮点展示 |
| :--- | :--- | :--- |
| **`examples/react-todo`**<br>**`examples/vue-todo`** | **TodoMVC 任务管理** | • 纯 TS Domain Store 驱动<br>• React 与 Vue 100% 共享业务与持久化代码 |
| **`examples/react-ballcraft`**<br>**`examples/vue-ballcraft`** | **BallCraft 物理碰撞沙盒** | • 6 个多层级专业领域服务协同调度<br>• 60FPS 极速渲染与细粒度状态同步 |
| **`examples/react-cart`**<br>**`examples/vue-cart`** | **高阶父子作用域电商购物车** | • 父子容器层级隔离（Hierarchical Scoped DI）<br>• Spring 风格 `@Autowired()` 零参数依赖装配<br>• 多币种换算、多税区计算与动态销毁回收 |

### 启动示例应用

```bash
# 启动 TodoMVC (React: 5174, Vue: 5175)
pnpm --filter @separa/example-react-todo dev
pnpm --filter @separa/example-vue-todo dev

# 启动 BallCraft 物理引擎 (React: 5176, Vue: 5177)
pnpm --filter @separa/example-react-ballcraft dev
pnpm --filter @separa/example-vue-ballcraft dev

# 启动 Scoped 购物车 (React: 5178, Vue: 5179)
pnpm --filter @separa/example-react-cart dev
pnpm --filter @separa/example-vue-cart dev
```

---

## 🛠️ Development & Testing / 研发与测试

```bash
# 安装依赖
pnpm install

# 全量构建所有核心包与示例
pnpm build
pnpm build:examples

# 全量类型检查与自动化测试 (16 个测试套件，82 项单元测试)
pnpm check
```

---

## 📄 License

[MIT](LICENSE)

