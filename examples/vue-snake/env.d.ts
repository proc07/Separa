/// <reference types="vite/client" />
/// <reference types="@separa/vite-plugin/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
