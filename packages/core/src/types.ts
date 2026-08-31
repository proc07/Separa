/** 仅用于类型系统的抽象构造函数，不限制运行时参数。 */
export type Constructor<T = object> = abstract new (...args: never[]) => T;
/** 仅用于类型系统的可实例化构造函数。 */
export type ConcreteConstructor<T = object> = new (...args: never[]) => T;

/** 名义化运行时服务身份；__type 是只用于类型推断的幻影子段。 */
export interface Token<T> {
  readonly id: symbol;
  readonly description: string;
  readonly __type?: T;
}

export type ServiceToken<T> = Constructor<T> | Token<T>;
/** 由生成注册表导出的类型化服务引用，可延迟交给任意容器解析。 */
export interface ServiceHandle<T> {
  readonly id: string;
  readonly token: ServiceToken<T>;
  resolve(container: ServiceContainer): T;
  resolveAsync(container: ServiceContainer): Promise<T>;
}
/** 多实现契约的类型化集合引用，通过 getAll() 解析全部绑定。 */
export interface ServiceCollectionHandle<T> {
  readonly id: string;
  readonly token: ServiceToken<T>;
  resolve(container: ServiceContainer): readonly T[];
  resolveAsync(container: ServiceContainer): Promise<readonly T[]>;
}
export type ServiceIdentifier<T> = ServiceToken<T> | ServiceHandle<T>;
export type Scope = "singleton" | "transient" | "request";

/** 描述一个构造参数应如何从容器解析。 */
export interface DependencyDescriptor<T = unknown> {
  readonly token: ServiceToken<T>;
  readonly optional?: boolean;
  readonly multiple?: boolean;
  readonly qualifier?: string;
}

export interface ServiceOptions<T = object> {
  token?: ServiceToken<T>;
  scope?: Scope;
  multi?: boolean;
  qualifier?: string;
  profile?: string | readonly string[];
}

export interface ServiceMetadata<T = object> {
  readonly target: ConcreteConstructor<T>;
  readonly token: ServiceToken<T>;
  readonly scope: Scope;
  readonly multi: boolean;
  readonly qualifier?: string;
  readonly profile?: string | readonly string[];
  readonly injections: ReadonlyMap<number, DependencyDescriptor>;
  readonly nonReactiveKeys: ReadonlySet<PropertyKey>;
}

export interface EnhanceOptions<T extends object> {
  readonly stateKeys: readonly (keyof T)[];
  readonly methodKeys: readonly (keyof T)[];
}

/** 编译插件或手动注册器交给 IoC 适配层的完整服务协议。
 * 未指定 T 时代表已擦除具体实现类型的异构注册项；显式传入 T 仍保留完整类型检查。
 */
export interface ServiceDefinition<T extends object = any> {
  readonly id: string;
  readonly token: ServiceToken<T>;
  readonly implementation: ConcreteConstructor<T>;
  readonly scope: Scope;
  readonly multi?: boolean;
  readonly qualifier?: string;
  readonly dependencies: readonly DependencyDescriptor[];
  readonly stateKeys: readonly PropertyKey[];
  readonly methodKeys: readonly PropertyKey[];
  /** 实例创建的唯一入口，负责解析依赖并执行响应式增强。 */
  readonly factory: (container: ServiceContainer) => T | Promise<T>;
  /** 实例构造并完成响应式增强后执行；异步结果会被 getAsync() 等待。 */
  readonly initialize?: (instance: T, container: ServiceContainer) => void | Promise<void>;
  readonly source?: string;
}

export interface ServiceManifestEntry {
  readonly id: string;
  readonly source?: string;
  readonly scope: Scope;
  readonly dependencies: readonly string[];
}

export interface ServiceContractManifestEntry {
  readonly id: string;
  readonly implementations: readonly string[];
  readonly multiple: boolean;
}

/** 生成注册表暴露的可序列化调试清单，不包含运行时构造函数。 */
export interface ServiceManifest {
  readonly services: readonly ServiceManifestEntry[];
  readonly contracts: readonly ServiceContractManifestEntry[];
}

/** 可按需装入独立子容器的服务定义集合。 */
export interface ServiceModule {
  readonly id: string;
  readonly definitions: readonly ServiceDefinition[];
  readonly manifest?: ServiceManifest;
}

/** Core 与具体 IoC 适配器之间的最小解析和生命周期协议。 */
export interface ServiceContainer {
  get<T>(identifier: ServiceIdentifier<T>): T;
  getQualified<T>(identifier: ServiceIdentifier<T>, qualifier: string): T;
  getAll<T>(identifier: ServiceIdentifier<T>): readonly T[];
  tryGet<T>(identifier: ServiceIdentifier<T>): T | undefined;
  tryGetQualified<T>(identifier: ServiceIdentifier<T>, qualifier: string): T | undefined;
  getAsync?<T>(identifier: ServiceIdentifier<T>): Promise<T>;
  getQualifiedAsync?<T>(identifier: ServiceIdentifier<T>, qualifier: string): Promise<T>;
  getAllAsync?<T>(identifier: ServiceIdentifier<T>): Promise<readonly T[]>;
  loadModule?(module: ServiceModule): ServiceContainer;
  unloadModule?(id: string): void | Promise<void>;
  dispose(): void | Promise<void>;
}
