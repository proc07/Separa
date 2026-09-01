import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/react.ts", "src/vue.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "vue", "@separa/core", "@separa/react", "@separa/vue"],
});
