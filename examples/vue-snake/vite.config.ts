import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import separa from "@separa/vite-plugin";

export default defineConfig({
  plugins: [
    vue(),
    separa({
      debugOutput: ".separa/registry.generated.ts",
      declarationOutput: ".separa/registry.generated.d.ts",
    }),
  ],
});
