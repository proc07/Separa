import "reflect-metadata";
import { identifierToken } from "./handles";
import type { ConcreteConstructor, DependencyDescriptor, ServiceContainer, ServiceIdentifier, ServiceMetadata, ServiceOptions, ServiceToken } from "./types";

interface MutableMetadata {
  options?: ServiceOptions;
  injections: Map<number, DependencyDescriptor>;
  propertyInjections: Map<PropertyKey, DependencyDescriptor>;
  nonReactiveKeys: Set<PropertyKey>;
}

// 元数据跟随类构造函数存活；使用 WeakMap 避免阻止动态模块中的类被垃圾回收。
const metadata = new WeakMap<Function, MutableMetadata>();

/** 获取类的可变元数据容器。多个装饰器会在不同阶段合并到同一份记录中。 */
function ensureMetadata(target: Function): MutableMetadata {
  let value = metadata.get(target);
  if (!value) {
    value = { injections: new Map(), propertyInjections: new Map(), nonReactiveKeys: new Set() };
    metadata.set(target, value);
  }
  return value;
}

function getReflectMetadata(key: string, target: Object, propertyKey?: PropertyKey): any {
  const r = typeof Reflect !== "undefined" ? (Reflect as any) : undefined;
  return typeof r?.getMetadata === "function" ? r.getMetadata(key, target, propertyKey) : undefined;
}

export function Service<T extends object>(options: ServiceOptions<T> = {}): ClassDecorator {
  return (target) => {
    // 装饰阶段只记录声明，不创建实例；真正的绑定与实例化由注册表和容器完成。
    ensureMetadata(target).options = options;
  };
}

export function Inject(token?: ServiceIdentifier<unknown>): ParameterDecorator & PropertyDecorator {
  return (target: Object, propertyKey?: string | symbol, parameterIndex?: number) => {
    if (typeof parameterIndex === "number") {
      // 构造函数参数注入
      const resolvedToken = token ? identifierToken(token) : getReflectMetadata("design:paramtypes", target)?.[parameterIndex];
      ensureMetadata(target as Function).injections.set(parameterIndex, { token: resolvedToken });
    } else if (propertyKey !== undefined) {
      // 类属性注入
      const meta = ensureMetadata(target.constructor);
      const resolvedToken = token ? identifierToken(token) : getReflectMetadata("design:type", target, propertyKey);
      meta.propertyInjections.set(propertyKey, { token: resolvedToken });
      meta.nonReactiveKeys.add(propertyKey);
    }
  };
}

/**
 * 属性自动装配装饰器（类似 Spring 的 @Autowired）。
 * 支持零参数调用 @Autowired()，自动根据 TypeScript 类型反射注入容器中的静态服务。
 */
export function Autowired(token?: ServiceIdentifier<unknown>): PropertyDecorator {
  return Inject(token) as PropertyDecorator;
}

export function Optional(token?: ServiceIdentifier<unknown>): ParameterDecorator & PropertyDecorator {
  return (target: Object, propertyKey?: string | symbol, parameterIndex?: number) => {
    if (typeof parameterIndex === "number") {
      const resolvedToken = token ? identifierToken(token) : getReflectMetadata("design:paramtypes", target)?.[parameterIndex];
      ensureMetadata(target as Function).injections.set(parameterIndex, { token: resolvedToken, optional: true });
    } else if (propertyKey !== undefined) {
      const meta = ensureMetadata(target.constructor);
      const resolvedToken = token ? identifierToken(token) : getReflectMetadata("design:type", target, propertyKey);
      meta.propertyInjections.set(propertyKey, { token: resolvedToken, optional: true });
      meta.nonReactiveKeys.add(propertyKey);
    }
  };
}

export function InjectMany(token?: ServiceIdentifier<unknown>): ParameterDecorator & PropertyDecorator {
  return (target: Object, propertyKey?: string | symbol, parameterIndex?: number) => {
    if (typeof parameterIndex === "number") {
      const resolvedToken = token ? identifierToken(token) : getReflectMetadata("design:paramtypes", target)?.[parameterIndex];
      ensureMetadata(target as Function).injections.set(parameterIndex, { token: resolvedToken, multiple: true });
    } else if (propertyKey !== undefined) {
      const meta = ensureMetadata(target.constructor);
      const resolvedToken = token ? identifierToken(token) : getReflectMetadata("design:type", target, propertyKey);
      meta.propertyInjections.set(propertyKey, { token: resolvedToken, multiple: true });
      meta.nonReactiveKeys.add(propertyKey);
    }
  };
}

/**
 * 多实现依赖的编译期标记。
 * Qualifier 不写入运行时装饰器元数据，由 Vite 插件读取 AST 后生成限定解析代码。
 */
export function Qualifier(_name: string): ParameterDecorator & PropertyDecorator {
  return () => undefined;
}

/** 将字段排除在编译插件生成的响应式 stateKeys 之外。 */
export function NonReactive(): PropertyDecorator {
  return (target, propertyKey) => {
    ensureMetadata(target.constructor).nonReactiveKeys.add(propertyKey);
  };
}

/** 获取类声明的所有属性注入依赖。 */
export function getPropertyInjections(target: Function): ReadonlyMap<PropertyKey, DependencyDescriptor> {
  const value = metadata.get(target);
  if (!value) return new Map();
  const result = new Map<PropertyKey, DependencyDescriptor>();
  for (const [key, descriptor] of value.propertyInjections) {
    const token = descriptor.token ?? getReflectMetadata("design:type", target.prototype, key) ?? getReflectMetadata("design:type", target, key);
    result.set(key, { ...descriptor, token });
  }
  return result;
}

/** 对实例执行属性注入，从容器中解析依赖并赋值。 */
export function injectProperties(instance: object, container: ServiceContainer): void {
  if (!instance || typeof instance !== "object") return;
  const target = instance.constructor;
  const injections = getPropertyInjections(target);
  for (const [key, descriptor] of injections) {
    let token = descriptor.token;
    if (!token) {
      token = getReflectMetadata("design:type", instance, key) ?? getReflectMetadata("design:type", target.prototype, key);
    }
    if (!token) {
      if (descriptor.optional) continue;
      throw new Error(
        `[Separa] Cannot resolve property injection type for '${String(key)}' on ${target.name}. Ensure TypeScript 'emitDecoratorMetadata' is enabled or pass an explicit token.`,
      );
    }
    if (descriptor.multiple) {
      (instance as any)[key] = container.getAll(token);
    } else if (descriptor.qualifier) {
      (instance as any)[key] = descriptor.optional
        ? container.tryGetQualified(token, descriptor.qualifier)
        : container.getQualified(token, descriptor.qualifier);
    } else if (descriptor.optional) {
      (instance as any)[key] = container.tryGet(token);
    } else {
      (instance as any)[key] = container.get(token);
    }
  }
}

/** 将分散的装饰器记录归一化为容器可消费的服务元数据。 */
export function getServiceMetadata<T extends object>(target: ConcreteConstructor<T>): ServiceMetadata<T> | undefined {
  const value = metadata.get(target);
  if (!value?.options) return undefined;

  return {
    target,
    // 未声明显式 Token 时，具体类本身就是服务身份。
    token: (value.options.token ?? target) as ServiceToken<T>,
    scope: value.options.scope ?? "transient",
    multi: value.options.multi ?? false,
    ...(value.options.qualifier ? { qualifier: value.options.qualifier } : {}),
    ...(value.options.profile ? { profile: value.options.profile } : {}),
    injections: value.injections,
    propertyInjections: getPropertyInjections(target),
    nonReactiveKeys: value.nonReactiveKeys,
  };
}
