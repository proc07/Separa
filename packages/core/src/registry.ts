import { enhanceService } from "./state-enhancer";
import type { ConcreteConstructor, DependencyDescriptor, ServiceDefinition, ServiceMetadata, ServiceToken } from "./types";
import { getServiceMetadata } from "./decorators";
import { tokenDescription } from "./tokens";

/** 沿继承链收集实例方法，供不经过编译器插件的手动注册路径使用。 */
function prototypeMethods(target: ConcreteConstructor): PropertyKey[] {
  const keys: PropertyKey[] = [];
  let prototype = target.prototype;
  while (prototype && prototype !== Object.prototype) {
    for (const key of Reflect.ownKeys(prototype)) {
      if (key === "constructor" || keys.includes(key)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
      if (typeof descriptor?.value === "function") keys.push(key);
    }
    prototype = Object.getPrototypeOf(prototype) as object | null;
  }
  return keys;
}

function isDependencyDescriptor(value: unknown): value is DependencyDescriptor {
  return typeof value === "object" && value !== null && "token" in value;
}

export function defineService<T extends object>(
  metadata: ServiceMetadata<T>,
  stateKeys: readonly (keyof T)[] = [],
  methodKeys: readonly (keyof T)[] = prototypeMethods(metadata.target) as (keyof T)[],
  explicitDependencies?: readonly DependencyDescriptor[],
): ServiceDefinition<T> {
  // 这是无编译插件路径的兼容推断。默认参数和 rest 参数会影响 Function.length，
  // 因此完整应用应优先使用 Vite 插件直接生成准确的依赖描述。
  const dependencyCount = explicitDependencies?.length ?? metadata.target.length;
  const dependencies =
    explicitDependencies ??
    Array.from({ length: dependencyCount }, (_, index) => {
      const dependency = metadata.injections.get(index);
      if (!dependency) {
        throw new Error(
          `Missing injection token for ${metadata.target.name} constructor parameter #${index}. Use @Inject() or the Separa Vite plugin.`,
        );
      }
      return dependency;
    });

  return {
    id: tokenDescription(metadata.token),
    token: metadata.token,
    implementation: metadata.target,
    scope: metadata.scope,
    multi: metadata.multi,
    ...(metadata.qualifier ? { qualifier: metadata.qualifier } : {}),
    dependencies,
    stateKeys,
    methodKeys,
    factory: (container) => {
      const args = dependencies.map((dependency) => {
        // 多重绑定优先返回集合；限定符随后决定单值绑定；可选依赖允许缺失。
        if (dependency.multiple) return container.getAll(dependency.token);
        if (dependency.qualifier) {
          return dependency.optional
            ? container.tryGetQualified(dependency.token, dependency.qualifier)
            : container.getQualified(dependency.token, dependency.qualifier);
        }
        if (dependency.optional) return container.tryGet(dependency.token);
        return container.get(dependency.token);
      });
      // 容器负责依赖，Core 负责构造实例并接入隐藏响应式状态。
      const instance = Reflect.construct(metadata.target, args) as T;
      return enhanceService(instance, { stateKeys, methodKeys });
    },
    ...((typeof metadata.target.prototype.onInit === "function"
      ? { initialize: (instance: T) => (instance as T & { onInit(): void | Promise<void> }).onInit() }
      : {})),
  };
}

/** 使用 @Service() 的运行时元数据创建定义，主要用于测试和无插件环境。 */
export function defineDecoratedService<T extends object>(
  target: ConcreteConstructor<T>,
  stateKeys: readonly (keyof T)[] = [],
  dependencies?: readonly (DependencyDescriptor | ServiceToken<any>)[],
): ServiceDefinition<T> {
  const metadata = getServiceMetadata(target);
  if (!metadata) throw new Error(`${target.name} is not decorated with @Service().`);
  const normalizedDependencies = dependencies?.map((dep) => (isDependencyDescriptor(dep) ? dep : { token: dep }));
  return defineService(metadata, stateKeys, undefined, normalizedDependencies);
}
