import "reflect-metadata";
import { Container } from "inversify";
import type { ResolutionContext } from "inversify";
import {
  disposeReactiveService,
  enhanceService,
  getServiceMetadata,
  identifierToken,
  injectProperties,
  isReactiveService,
  isToken,
  tokenDescription,
} from "@separa/core";
import type {
  ConcreteConstructor,
  ServiceContainer,
  ServiceDefinition,
  ServiceHandle,
  ServiceIdentifier,
  ServiceModule,
  ServiceToken,
  Token,
} from "@separa/core";

export interface ServiceOverride<T extends object = object> {
  readonly token: ServiceIdentifier<T>;
  readonly implementation?: ConcreteConstructor<T>;
  readonly value?: T;
}

export interface ContainerOptions {
  readonly definitions?: readonly ServiceDefinition[];
  readonly overrides?: readonly ServiceOverride[];
  readonly parent?: SeparaContainer;
}

export interface ProviderBuilder<T extends object> {
  useClass(implementation: ConcreteConstructor<T>): ServiceOverride<T>;
  useValue(value: T): ServiceOverride<T>;
}

export function provide<T extends object>(token: ServiceIdentifier<T>): ProviderBuilder<T> {
  return {
    useClass: (implementation) => ({ token, implementation }),
    useValue: (value) => ({ token, value }),
  };
}

function isContainerOptions(value: unknown): value is ContainerOptions {
  if (!value || typeof value !== "object") return false;
  return "definitions" in value || "overrides" in value || "parent" in value;
}

function isServiceDefinition(value: unknown): value is ServiceDefinition {
  return typeof value === "object" && value !== null && "id" in value && "factory" in value;
}

function isServiceOverride(value: unknown): value is ServiceOverride {
  return typeof value === "object" && value !== null && "token" in value && ("implementation" in value || "value" in value);
}

/** 将 Core 服务身份转换为 Inversify 接受的 class 或 symbol，同时隐匿引擎类型。 */
function identifier<T>(value: ServiceIdentifier<T>): ConcreteConstructor<T> | symbol {
  const token = identifierToken(value);
  return isToken(token) ? token.id : (token as ConcreteConstructor<T>);
}

/**
 * Separa 的 Inversify 适配器。业务层只依赖 Core 的 ServiceContainer 协议，
 * 注册、作用域、named binding 和资源释放等引擎细节均封装在此处。
 */
export class SeparaContainer implements ServiceContainer {
  private readonly _container: Container;
  private readonly _parent: SeparaContainer | undefined;
  private readonly _created = new Set<object>();
  private readonly _multiIdentifiers = new Set<ConcreteConstructor | symbol>();
  private readonly _qualifiers = new Map<unknown, Set<string>>();
  private readonly _modules = new Map<string, SeparaContainer>();
  private _disposed = false;

  constructor(options: ContainerOptions = {}) {
    this._parent = options.parent;
    this._container = new Container(options.parent ? { parent: options.parent._container } : {});

    // 默认自绑定容器实例，使需要动态创建子作用域的服务可直接注入 SeparaContainer
    this._container.bind<SeparaContainer>(SeparaContainer).toDynamicValue(() => this);

    // 先索引 Override，使替换在定义注册阶段完成，而不是注册后再重新绑定。
    const overrides = new Map((options.overrides ?? []).map((override) => [identifier(override.token), override]));

    for (const definition of options.definitions ?? []) {
      const id = identifier(definition.token);
      const override = overrides.get(id);
      if (override) {
        this._registerOverride(override);
        overrides.delete(id);
      } else {
        this.register(definition);
      }
    }

    for (const override of overrides.values()) this._registerOverride(override);
  }

  register<T extends object>(definition: ServiceDefinition<T>): void {
    this._assertActive();
    const id = identifier(definition.token);
    if (this._container.isBound(id) && (!definition.multi || !this._multiIdentifiers.has(id))) {
      throw new Error(`Duplicate service binding: ${definition.id}.`);
    }
    if (definition.multi) this._multiIdentifiers.add(id);

    // 实例通过 factory 创建；使用 context 感知发起方解析上下文，自动完成依赖注入与响应式增强。
    const binding = this._container.bind<T>(id).toDynamicValue((context) => {
      const requesting = context ? this._wrapContext(context) : this;
      return this._createInstance(definition, requesting);
    });

    switch (definition.scope) {
      case "singleton":
        binding.inSingletonScope();
        break;
      case "request":
        binding.inRequestScope();
        break;
      case "transient":
        binding.inTransientScope();
        break;
    }

    if (definition.qualifier) {
      binding.whenNamed(definition.qualifier);
      // Inversify 的无条件 getAll 不返回 named binding，因此额外保存限定符用于聚合。
      const qualifiers = this._qualifiers.get(id) ?? new Set<string>();
      qualifiers.add(definition.qualifier);
      this._qualifiers.set(id, qualifiers);
    }
  }

  get<T>(token: ServiceIdentifier<T>): T {
    this._assertActive();
    const id = identifier(token);
    try {
      return this._container.get<T>(id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve ${tokenDescription(identifierToken(token))}: ${reason}`, { cause: error });
    }
  }

  /**
   * 绑定并装配目标服务实例：
   * 1. 若已注册在容器中，直接从容器解析获取 (get)；
   * 2. 若传入未显式注册的类，自动实例化并执行属性依赖注入与响应式增强 (resolve)。
   */
  bind<T extends object>(tokenOrTarget: ServiceIdentifier<T>, ...args: any[]): T {
    this._assertActive();
    const id = identifier(tokenOrTarget);
    if (this._container.isBound(id)) {
      return this.get(tokenOrTarget);
    }
    if (typeof tokenOrTarget === "function") {
      return this.resolve(tokenOrTarget as ConcreteConstructor<T>, ...args);
    }
    return this.get(tokenOrTarget);
  }

  getAll<T>(token: ServiceIdentifier<T>): readonly T[] {
    this._assertActive();
    const id = identifier(token);
    const current = this._container.getAll<T>(id, { optional: true });
    const allQualifiers = new Set<string>();
    let p: SeparaContainer | undefined = this;
    while (p) {
      for (const q of p._qualifiers.get(id) ?? []) allQualifiers.add(q);
      p = p._parent;
    }
    const qualified = [...allQualifiers].flatMap((qualifier) =>
      this._container.getAll<T>(id, { name: qualifier, optional: true }),
    );
    return [...current, ...qualified];
  }

  getQualified<T>(token: ServiceIdentifier<T>, qualifier: string): T {
    const value = this.tryGetQualified(token, qualifier);
    if (value !== undefined) return value;
    throw new Error(`No binding found for ${tokenDescription(identifierToken(token))} with qualifier ${JSON.stringify(qualifier)}.`);
  }

  tryGet<T>(token: ServiceIdentifier<T>): T | undefined {
    this._assertActive();
    const id = identifier(token);
    return this._container.get<T>(id, { optional: true });
  }

  tryGetQualified<T>(token: ServiceIdentifier<T>, qualifier: string): T | undefined {
    this._assertActive();
    const id = identifier(token);
    return this._container.get<T>(id, { name: qualifier, optional: true });
  }

  async getAsync<T>(token: ServiceIdentifier<T>): Promise<T> {
    this._assertActive();
    const id = identifier(token);
    try {
      return await this._container.getAsync<T>(id);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to resolve ${tokenDescription(identifierToken(token))}: ${reason}`, { cause: error });
    }
  }

  async resolveAsync<T>(token: ServiceIdentifier<T>): Promise<T> {
    return this.getAsync(token);
  }

  async bindAsync<T>(token: ServiceIdentifier<T>): Promise<T> {
    return this.getAsync(token);
  }

  async getQualifiedAsync<T>(token: ServiceIdentifier<T>, qualifier: string): Promise<T> {
    const id = identifier(token);
    const current = await this._container.getAsync<T>(id, { name: qualifier, optional: true });
    if (current !== undefined) return current;
    throw new Error(`No binding found for ${tokenDescription(identifierToken(token))} with qualifier ${JSON.stringify(qualifier)}.`);
  }

  async getAllAsync<T>(token: ServiceIdentifier<T>): Promise<readonly T[]> {
    this._assertActive();
    const id = identifier(token);
    const current = await this._container.getAllAsync<T>(id, { optional: true });
    const allQualifiers = new Set<string>();
    let p: SeparaContainer | undefined = this;
    while (p) {
      for (const q of p._qualifiers.get(id) ?? []) allQualifiers.add(q);
      p = p._parent;
    }
    const qualified = (
      await Promise.all(
        [...allQualifiers].map((qualifier) => this._container.getAllAsync<T>(id, { name: qualifier, optional: true })),
      )
    ).flat();
    return [...current, ...qualified];
  }

  createScope(...args: (object | readonly object[] | ContainerOptions)[]): SeparaContainer {
    this._assertActive();
    if (args.length === 0) {
      return new SeparaContainer({ parent: this });
    }

    if (args.length === 1 && isContainerOptions(args[0])) {
      return new SeparaContainer({ ...(args[0] as ContainerOptions), parent: this });
    }

    const items = args.flatMap((arg) => (Array.isArray(arg) ? arg : [arg]));
    const definitions: ServiceDefinition[] = [];
    const overrides: ServiceOverride[] = [];

    for (const item of items) {
      if (!item || typeof item !== "object") continue;

      if (isServiceDefinition(item)) {
        definitions.push(item);
      } else if (isServiceOverride(item)) {
        overrides.push(item);
      } else {
        const ctor = (item as object).constructor;
        if (ctor && ctor !== Object) {
          overrides.push({ token: ctor as ConcreteConstructor<any>, value: item as any });
        }
      }
    }

    return new SeparaContainer({ definitions, overrides, parent: this });
  }

  /** 动态模块使用子容器隔离绑定；模块服务仍可解析宿主容器中的契约。 */
  loadModule(module: ServiceModule): SeparaContainer {
    this._assertActive();
    if (this._modules.has(module.id)) throw new Error(`Service module ${JSON.stringify(module.id)} is already loaded.`);
    const container = new SeparaContainer({ definitions: module.definitions, parent: this });
    this._modules.set(module.id, container);
    return container;
  }

  async unloadModule(id: string): Promise<void> {
    const container = this._modules.get(id);
    if (!container) return;
    this._modules.delete(id);
    await container.dispose();
  }

  async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;
    const errors: unknown[] = [];
    for (const [id, module] of [...this._modules].reverse()) {
      this._modules.delete(id);
      try {
        await module.dispose();
      } catch (error) {
        errors.push(error);
      }
    }
    // 按创建逆序销毁，尽量让依赖方先于其依赖释放。
    for (const instance of [...this._created].reverse()) {
      const candidate = instance as { dispose?: () => unknown; onDestroy?: () => unknown };
      const callback = candidate.onDestroy ?? candidate.dispose;
      if (callback) {
        try {
          await callback.call(instance);
        } catch (error) {
          errors.push(error);
        }
      }
      // 即使业务生命周期回调失败，也继续释放 Core 的响应式订阅。
      disposeReactiveService(instance);
    }
    this._created.clear();
    if (errors.length) throw new AggregateError(errors, "One or more services failed to dispose.");
  }

  resolve<T extends object>(target: ConcreteConstructor<T>, ...args: any[]): T {
    this._assertActive();
    const instance = new (target as new (...args: any[]) => T)(...args);
    const enhanced = this._enhanceOverrideValue(instance);
    injectProperties(enhanced, this);
    this._created.add(enhanced);
    return enhanced;
  }

  private _registerOverride<T extends object>(override: ServiceOverride<T>): void {
    const id = identifier(override.token);
    if (override.value) {
      const value = this._enhanceOverrideValue(override.value);
      injectProperties(value, this);
      this._created.add(value);
      this._container.bind<T>(id).toConstantValue(value);
      return;
    }
    if (!override.implementation) throw new Error("Override must define a class or value.");
    this._container
      .bind<T>(id)
      .toDynamicValue(() => {
        const instance = new override.implementation!();
        const enhanced = this._enhanceOverrideValue(instance);
        injectProperties(enhanced, this);
        this._created.add(enhanced);
        return enhanced;
      })
      .inSingletonScope();
  }

  private _enhanceOverrideValue<T extends object>(value: T): T {
    if (isReactiveService(value)) return value;

    const ctor = (value as object).constructor as ConcreteConstructor<T> | undefined;
    const metadata = ctor ? getServiceMetadata(ctor) : undefined;
    const nonReactiveKeys = metadata?.nonReactiveKeys ?? new Set<PropertyKey>();

    // 收集 stateKeys: 自身的非函数属性，排除 nonReactiveKeys
    const stateKeys: (keyof T)[] = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") continue;
      if (nonReactiveKeys.has(key)) continue;
      if (typeof (value as any)[key] === "function") continue;
      stateKeys.push(key as keyof T);
    }

    // 收集 methodKeys: 原型链上的方法（排除 constructor）
    const methodKeys: (keyof T)[] = [];
    let proto = Object.getPrototypeOf(value);
    while (proto && proto !== Object.prototype) {
      for (const key of Reflect.ownKeys(proto)) {
        if (key === "constructor" || methodKeys.includes(key as keyof T)) continue;
        const desc = Object.getOwnPropertyDescriptor(proto, key);
        if (typeof desc?.value === "function") {
          methodKeys.push(key as keyof T);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }

    return enhanceService(value, { stateKeys, methodKeys });
  }

  private _wrapContext(context: ResolutionContext): ServiceContainer {
    return {
      get: <K>(token: ServiceIdentifier<K>): K => {
        const id = identifier(token);
        return context.get(id as any);
      },
      getAll: <K>(token: ServiceIdentifier<K>): readonly K[] => {
        const id = identifier(token);
        return context.getAll(id as any);
      },
      getQualified: <K>(token: ServiceIdentifier<K>, qualifier: string): K => {
        const id = identifier(token);
        return context.get(id as any, { name: qualifier });
      },
      tryGet: <K>(token: ServiceIdentifier<K>): K | undefined => {
        const id = identifier(token);
        return context.get(id as any, { optional: true });
      },
      tryGetQualified: <K>(token: ServiceIdentifier<K>, qualifier: string): K | undefined => {
        const id = identifier(token);
        return context.get(id as any, { name: qualifier, optional: true });
      },
      getAsync: async <K>(token: ServiceIdentifier<K>): Promise<K> => {
        const id = identifier(token);
        return await context.getAsync(id as any);
      },
      dispose: () => this.dispose(),
    };
  }

  private _createInstance<T extends object>(definition: ServiceDefinition<T>, container: ServiceContainer = this): T | Promise<T> {
    const enhance = (instance: T): T => {
      const hasKeys = (definition.stateKeys?.length ?? 0) > 0 || (definition.methodKeys?.length ?? 0) > 0;
      let current = instance;
      if (hasKeys && !isReactiveService(current)) {
        current = enhanceService(current, {
          stateKeys: (definition.stateKeys ?? []) as (keyof T)[],
          methodKeys: (definition.methodKeys ?? []) as (keyof T)[],
        });
      }
      injectProperties(current, container);
      return current;
    };

    const finish = async (raw: T): Promise<T> => {
      const instance = enhance(raw);
      await definition.initialize?.(instance, container);
      this._created.add(instance);
      return instance;
    };

    const created = definition.factory(container);
    if (created instanceof Promise) return created.then(finish);

    const instance = enhance(created);
    const initialized = definition.initialize?.(instance, container);
    if (initialized instanceof Promise) {
      return initialized.then(() => {
        this._created.add(instance);
        return instance;
      });
    }
    this._created.add(instance);
    return instance;
  }

  private _assertActive(): void {
    if (this._disposed) throw new Error("The Separa container has been disposed.");
  }
}

export function createContainer(options: ContainerOptions = {}): SeparaContainer {
  return new SeparaContainer(options);
}

export type { ServiceContainer, ServiceDefinition, ServiceHandle, ServiceIdentifier, ServiceToken, Token };
