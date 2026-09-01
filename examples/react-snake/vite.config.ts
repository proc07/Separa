import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import separa from "@separa/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    separa({
      debugOutput: ".separa/registry.generated.ts",
      declarationOutput: ".separa/registry.generated.d.ts",
    }),
  ],
});
