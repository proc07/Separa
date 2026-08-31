/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "virtual:separa/registry" {
  import type { ServiceDefinition, ServiceModule } from "@separa/core";
  export const serviceDefinitions: readonly ServiceDefinition[];
  export const serviceModule: ServiceModule;
  export const serviceManifest: Record<string, unknown>;
  export const generatedServices: Record<string, unknown>;
}
