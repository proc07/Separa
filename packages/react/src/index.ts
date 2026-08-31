import { createContext, createElement, useContext, useMemo, useSyncExternalStore, type PropsWithChildren, type ReactElement } from "react";
import { getReactiveController } from "@separa/core";
import type { ServiceContainer, ServiceIdentifier } from "@separa/core";

const ContainerContext = createContext<ServiceContainer | null>(null);

export interface SeparaProviderProps extends PropsWithChildren {
  readonly container: ServiceContainer;
}

/** 将一个 Separa 容器绑定到当前 React 子树。 */
export function SeparaProvider({ container, children }: SeparaProviderProps): ReactElement {
  return createElement(ContainerContext.Provider, { value: container }, children);
}

/** 获取当前 React 子树中的容器。 */
export function useContainer(): ServiceContainer {
  const container = useContext(ContainerContext);
  if (!container) throw new Error("useService() must be used inside <SeparaProvider>.");
  return container;
}

/**
 * 解析并订阅响应式 Service。useSyncExternalStore 提供并发渲染和 SSR 所需的
 * 一致快照协议；未增强的普通对象仍可解析，只是不会触发重新渲染。
 */
export function useService<T extends object>(token: ServiceIdentifier<T>): T {
  const container = useContainer();
  // 容器或服务身份不变时保持同一实例，避免渲染期间重复解析 transient 服务。
  const service = useMemo(() => container.get(token), [container, token]);
  const controller = getReactiveController(service);
  const subscribe = useMemo(() => (controller ? controller.subscribe.bind(controller) : () => () => undefined), [controller]);
  const getSnapshot = useMemo(() => (controller ? controller.getSnapshot.bind(controller) : () => service), [controller, service]);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return service;
}

/** 在完整 Service 订阅之上提供轻量的选择器调用接口。 */
export function useServiceState<T extends object, Selected>(token: ServiceIdentifier<T>, selector: (service: T) => Selected): Selected {
  const service = useService(token);
  return selector(service);
}
