import type { ServiceCollectionHandle, ServiceContainer, ServiceHandle, ServiceIdentifier, ServiceToken } from "./types";

/**
 * 创建可跨模块传递的延迟解析句柄。
 * Handle 不缓存服务实例，实例生命周期仍完全由传入的容器控制。
 */
export function createServiceHandle<T>(id: string, token: ServiceToken<T>, qualifier?: string): ServiceHandle<T> {
  return Object.freeze({
    id,
    token,
    resolve: (container: ServiceContainer) => (qualifier ? container.getQualified(token, qualifier) : container.get(token)),
    // 同步容器也能通过 Promise 兼容统一的异步调用方。
    resolveAsync: (container: ServiceContainer) =>
      qualifier
        ? container.getQualifiedAsync
          ? container.getQualifiedAsync(token, qualifier)
          : Promise.resolve(container.getQualified(token, qualifier))
        : container.getAsync
          ? container.getAsync(token)
          : Promise.resolve(container.get(token)),
  });
}

/** 创建多实现契约句柄；异步版本会并行等待所有异步绑定。 */
export function createServiceCollectionHandle<T>(id: string, token: ServiceToken<T>): ServiceCollectionHandle<T> {
  return Object.freeze({
    id,
    token,
    resolve: (container: ServiceContainer) => container.getAll(token),
    resolveAsync: (container: ServiceContainer) => (container.getAllAsync ? container.getAllAsync(token) : Promise.resolve(container.getAll(token))),
  });
}

/** 将类、Token 或生成的 Handle 归一化为容器底层使用的服务身份。 */
export function identifierToken<T>(identifier: ServiceIdentifier<T>): ServiceToken<T> {
  return typeof identifier === "object" && identifier !== null && "token" in identifier ? identifier.token : identifier;
}
