import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SeparaProvider } from "@separa/react";
import { createContainer } from "@separa/ioc-inversify";
import { serviceModule } from "virtual:separa/registry";
import App from "./App";

const container = createContainer({ definitions: serviceModule.definitions });

const root = document.getElementById("root")!;
createRoot(root).render(
  <StrictMode>
    <SeparaProvider container={container}>
      <App />
    </SeparaProvider>
  </StrictMode>,
);
