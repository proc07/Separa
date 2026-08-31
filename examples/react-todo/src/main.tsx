import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SeparaProvider } from "@separa/react";
import { createContainer } from "@separa/ioc-inversify";
import { serviceModule } from "virtual:separa/registry";
import App from "./App";

/**
 * 创建容器时直接使用 Separa Vite 插件扫描到的 serviceModule，
 * TodoService 的所有依赖自动完成注册，无需手动 import。
 */
const container = createContainer({ definitions: serviceModule.definitions });

const root = document.getElementById("root")!;
createRoot(root).render(
  <StrictMode>
    <SeparaProvider container={container}>
      <App />
    </SeparaProvider>
  </StrictMode>,
);
