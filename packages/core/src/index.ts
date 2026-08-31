// 此文件定义 @separa/core 的稳定公共 API；内部实现不应绕过这里被业务包直接导入。
export { Inject, InjectMany, NonReactive, Optional, Qualifier, Service, getServiceMetadata } from "./decorators";
export { createServiceCollectionHandle, createServiceHandle, identifierToken } from "./handles";
export { defineDecoratedService, defineService } from "./registry";
export { disposeReactiveService, enhanceService, getReactiveController, isReactiveService } from "./state-enhancer";
export { createContractToken, createToken, isToken, tokenDescription } from "./tokens";
export type {
  ConcreteConstructor,
  Constructor,
  DependencyDescriptor,
  EnhanceOptions,
  Scope,
  ServiceContainer,
  ServiceCollectionHandle,
  ServiceContractManifestEntry,
  ServiceDefinition,
  ServiceHandle,
  ServiceIdentifier,
  ServiceManifest,
  ServiceManifestEntry,
  ServiceMetadata,
  ServiceModule,
  ServiceOptions,
  ServiceToken,
  Token,
} from "./types";
export type { ReactiveServiceController } from "./state-enhancer";
