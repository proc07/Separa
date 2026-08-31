import { createApp } from "vue";
import { createSeparaPlugin } from "@separa/vue";
import { createContainer } from "@separa/ioc-inversify";
import { serviceModule } from "virtual:separa/registry";
import App from "./App.vue";

/**
 * 创建容器时直接使用 Separa Vite 插件扫描到的 serviceModule，
 * TodoService 的所有依赖自动完成注册，无需手动 import。
 */
const container = createContainer({ definitions: serviceModule.definitions });

createApp(App)
  .use(createSeparaPlugin(container))
  .mount("#app");
