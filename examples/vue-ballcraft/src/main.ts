import { createApp } from "vue";
import { createSeparaPlugin } from "@separa/vue";
import { createContainer } from "@separa/ioc-inversify";
import { serviceModule } from "virtual:separa/registry";
import App from "./App.vue";

const container = createContainer({ definitions: serviceModule.definitions });

createApp(App)
  .use(createSeparaPlugin(container))
  .mount("#app");
