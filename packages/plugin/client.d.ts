declare module "virtual:separa/registry" {
  import type { ServiceDefinition, ServiceManifest, ServiceModule } from "@separa/core";

  /** 由 Separa 编译插件生成的项目级类型会合并到此接口。 */
  export interface GeneratedServices {}

  export const serviceDefinitions: readonly ServiceDefinition[];
  export const generatedServices: GeneratedServices;
  export const serviceManifest: ServiceManifest;
  export const serviceModule: ServiceModule;
}
