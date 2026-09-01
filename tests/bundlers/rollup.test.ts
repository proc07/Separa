// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { rollup } from "rollup";
import separaRollup from "@separa/vite-plugin/rollup";
import { rollup as separaRollupNamed } from "@separa/vite-plugin";

describe("Rollup Bundler Plugin Integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-rollup-test-"));
    const tsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
      include: ["src/**/*"],
    };
    fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });

    // Inventory Service
    fs.writeFileSync(
      path.join(tmpDir, "src/inventory.service.ts"),
      `
        import { Service } from "@separa/core";
        @Service({ scope: "singleton" })
        export class InventoryService {
          stock = 100;
        }
      `,
    );

    // Entry point importing virtual registry
    fs.writeFileSync(
      path.join(tmpDir, "src/index.ts"),
      `
        import { serviceDefinitions } from "virtual:separa/registry";
        console.log(serviceDefinitions);
      `,
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("bundles application and resolves virtual:separa/registry with subpath export", async () => {
    const bundle = await rollup({
      input: path.join(tmpDir, "src/index.ts"),
      external: (id) => id.includes("@separa/core"),
      plugins: [
        separaRollup({
          root: tmpDir,
          debugOutput: false,
          declarationOutput: false,
        }),
      ],
    });

    const { output } = await bundle.generate({ format: "esm" });
    const code = output[0].code;

    expect(code).toContain("InventoryService");
    expect(code).toContain("serviceDefinitions");
  });

  it("works with named export from main package", async () => {
    const bundle = await rollup({
      input: path.join(tmpDir, "src/index.ts"),
      external: (id) => id.includes("@separa/core"),
      plugins: [
        separaRollupNamed({
          root: tmpDir,
          debugOutput: false,
          declarationOutput: false,
        }),
      ],
    });

    const { output } = await bundle.generate({ format: "esm" });
    const code = output[0].code;

    expect(code).toContain("InventoryService");
    expect(code).toContain("serviceDefinitions");
  });
});
