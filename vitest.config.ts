import path from "node:path";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
  plugins: [swc.vite()],
  resolve: {
    alias: {
      "@separa/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@separa/ioc-inversify": path.resolve(__dirname, "packages/ioc-inversify/src/index.ts"),
      "@separa/react": path.resolve(__dirname, "packages/react/src/index.ts"),
      "@separa/vue": path.resolve(__dirname, "packages/vue/src/index.ts"),
      "@separa/vite-plugin": path.resolve(__dirname, "packages/vite-plugin/src/index.ts"),
      "@separa/example-todo-shared": path.resolve(__dirname, "examples/todo-shared/src/index.ts"),
      "@separa/example-ballcraft-shared": path.resolve(__dirname, "examples/ballcraft-shared/src/index.ts"),
      "@separa/example-cart-shared": path.resolve(__dirname, "examples/cart-shared/src/index.ts"),
    },
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "examples/**/tests/**/*.test.ts",
      "examples/**/tests/**/*.test.tsx",
    ],
    environment: "jsdom",
    coverage: {
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/*/src/**/types.ts", "packages/*/src/**/*.d.ts"],
      reporter: ["text"],
    },
  },
});
