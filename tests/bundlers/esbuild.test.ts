// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import esbuild from "esbuild";
import separaEsbuild from "@separa/vite-plugin/esbuild";
import { esbuild as separaEsbuildNamed } from "@separa/vite-plugin";

describe("esbuild Bundler Plugin Integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-esbuild-test-"));
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

    // Config Service
    fs.writeFileSync(
      path.join(tmpDir, "src/config.service.ts"),
      `
        import { Service } from "@separa/core";
        @Service({ scope: "singleton" })
        export class ConfigService {
          env = "production";
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
    const result = await esbuild.build({
      entryPoints: [path.join(tmpDir, "src/index.ts")],
      bundle: true,
      write: false,
      alias: {
        "@separa/core": path.resolve(__dirname, "../../packages/core/dist/index.js"),
      },
      plugins: [
        separaEsbuild({
          root: tmpDir,
          debugOutput: false,
          declarationOutput: false,
        }),
      ],
    });

    const code = result.outputFiles![0]!.text;
    expect(code).toContain("ConfigService");
    expect(code).toContain("serviceDefinitions");
  });

  it("works with named export from main package", async () => {
    const result = await esbuild.build({
      entryPoints: [path.join(tmpDir, "src/index.ts")],
      bundle: true,
      write: false,
      alias: {
        "@separa/core": path.resolve(__dirname, "../../packages/core/dist/index.js"),
      },
      plugins: [
        separaEsbuildNamed({
          root: tmpDir,
          debugOutput: false,
          declarationOutput: false,
        }),
      ],
    });

    const code = result.outputFiles![0]!.text;
    expect(code).toContain("ConfigService");
    expect(code).toContain("serviceDefinitions");
  });
});
