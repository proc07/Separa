import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import separa from "@separa/plugin";

export default defineConfig({
  plugins: [
    vue(),
    separa({
      debugOutput: ".separa/registry.generated.ts",
      declarationOutput: ".separa/registry.generated.d.ts",
    }),
  ],
});
