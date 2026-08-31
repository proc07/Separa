# Separa

**Separa - Separate your logic, simplify your UI.**

Separa 是一个跨 React/Vue 的 IoC/DI 与响应式 Service 框架。业务类只声明普通字段、构造函数依赖和业务方法；框架通过 Inversify、Valtio Vanilla 与 UI Adapter 完成依赖解析和界面更新。

## 包

- `@separa/core`: 公共装饰器、Token、注册定义与状态增强。
- `@separa/ioc-inversify`: 容器、作用域、Override 与生命周期适配。
- `@separa/react`: Provider 和响应式 Hooks。
- `@separa/vue`: Vue Plugin 和只读 Ref Facade。
- `@separa/vite-plugin`: 编译期 Service 扫描和静态注册清单生成。

## 开发

```sh
pnpm install
pnpm check
```

运行示例:

```sh
pnpm --filter @separa/example-react-basic dev
pnpm --filter @separa/example-vue-basic dev
```

React 与 Vue 示例复用 `@separa/example-todo-domain` 中同一个 `TodoStore`，覆盖 TodoMVC 的新增、编辑、完成、全选、清除、筛选、清除已完成和 localStorage 持久化功能。执行 `pnpm build:examples` 可同时验证两个生产构建。

详细设计见 [framework-design-requirements.md](./framework-design-requirements.md)。
实现进度与下一阶段见 [docs/development-status.md](./docs/development-status.md)。
