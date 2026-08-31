import type { ConcreteConstructor, DependencyDescriptor, ServiceMetadata, ServiceOptions, ServiceToken } from "./types";

interface MutableMetadata {
  options?: ServiceOptions;
  injections: Map<number, DependencyDescriptor>;
  nonReactiveKeys: Set<PropertyKey>;
}

// 元数据跟随类构造函数存活；使用 WeakMap 避免阻止动态模块中的类被垃圾回收。
const metadata = new WeakMap<Function, MutableMetadata>();

/** 获取类的可变元数据容器。多个装饰器会在不同阶段合并到同一份记录中。 */
function ensureMetadata(target: Function): MutableMetadata {
  let value = metadata.get(target);
  if (!value) {
    value = { injections: new Map(), nonReactiveKeys: new Set() };
    metadata.set(target, value);
  }
  return value;
}

export function Service<T extends object>(options: ServiceOptions<T> = {}): ClassDecorator {
  return (target) => {
    // 装饰阶段只记录声明，不创建实例；真正的绑定与实例化由注册表和容器完成。
    ensureMetadata(target).options = options;
  };
}

export function Inject(token: ServiceToken<unknown>): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    // 参数下标是构造函数依赖顺序的唯一运行时依据。
    ensureMetadata(target as Function).injections.set(parameterIndex, { token });
  };
}

export function Optional(token: ServiceToken<unknown>): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    ensureMetadata(target as Function).injections.set(parameterIndex, { token, optional: true });
  };
}

export function InjectMany(token: ServiceToken<unknown>): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    ensureMetadata(target as Function).injections.set(parameterIndex, { token, multiple: true });
  };
}

/**
 * 多实现依赖的编译期标记。
 * Qualifier 不写入运行时装饰器元数据，由 Vite 插件读取 AST 后生成限定解析代码。
 */
export function Qualifier(_name: string): ParameterDecorator {
  return () => undefined;
}

/** 将字段排除在编译插件生成的响应式 stateKeys 之外。 */
export function NonReactive(): PropertyDecorator {
  return (target, propertyKey) => {
    ensureMetadata(target.constructor).nonReactiveKeys.add(propertyKey);
  };
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
    nonReactiveKeys: value.nonReactiveKeys,
  };
}
