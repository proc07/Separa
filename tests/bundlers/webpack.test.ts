// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import webpack from "webpack";
import separaWebpack from "@separa/plugin/webpack";
import { webpack as separaWebpackNamed } from "@separa/plugin";

describe("Webpack 5 Bundler Plugin Integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-webpack-test-"));
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

    // Logger Service
    fs.writeFileSync(
      path.join(tmpDir, "src/logger.service.ts"),
      `
        import { Service } from "@separa/core";
        @Service({ scope: "singleton" })
        export class LoggerService {
          prefix = "[LOG]";
          log(msg: string) { return this.prefix + " " + msg; }
        }
      `,
    );

    // App Service with Autowired
    fs.writeFileSync(
      path.join(tmpDir, "src/app.service.ts"),
      `
        import { Service, Autowired } from "@separa/core";
        import { LoggerService } from "./logger.service";

        @Service({ scope: "singleton" })
        export class AppService {
          @Autowired()
          logger!: LoggerService;

          status = "ready";
        }
      `,
    );

    // Entry point importing virtual registry
    fs.writeFileSync(
      path.join(tmpDir, "src/index.ts"),
      `
        import { serviceDefinitions } from "virtual:separa/registry";
        import { AppService } from "./app.service";

        export { serviceDefinitions, AppService };
      `,
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("bundles application and resolves virtual:separa/registry with subpath export", async () => {
    const outputPath = path.join(tmpDir, "dist");

    await new Promise<void>((resolve, reject) => {
      webpack(
        {
          mode: "production",
          entry: path.join(tmpDir, "src/index.ts"),
          context: tmpDir,
          output: {
            path: outputPath,
            filename: "bundle.js",
            library: { type: "commonjs" },
          },
          resolve: {
            extensions: [".ts", ".js"],
            alias: {
              "@separa/core": path.resolve(__dirname, "../../packages/core/dist/index.js"),
            },
          },
          plugins: [
            separaWebpack({
              debugOutput: false,
              declarationOutput: false,
            }),
          ],
        },
        (err, stats) => {
          if (err) return reject(err);
          if (stats?.hasErrors()) return reject(stats.toJson().errors);
          resolve();
        },
      );
    });

    const bundleContent = fs.readFileSync(path.join(outputPath, "bundle.js"), "utf-8");

    // Verify virtual module and services are included
    expect(bundleContent).toContain("AppService");
    expect(bundleContent).toContain("LoggerService");
    expect(bundleContent).toContain("serviceDefinitions");
  }, 15_000);

  it("works with named export from main package", async () => {
    const outputPath = path.join(tmpDir, "dist-named");

    await new Promise<void>((resolve, reject) => {
      webpack(
        {
          mode: "production",
          entry: path.join(tmpDir, "src/index.ts"),
          context: tmpDir,
          output: {
            path: outputPath,
            filename: "bundle.js",
            library: { type: "commonjs" },
          },
          resolve: {
            extensions: [".ts", ".js"],
            alias: {
              "@separa/core": path.resolve(__dirname, "../../packages/core/dist/index.js"),
            },
          },
          plugins: [
            separaWebpackNamed({
              debugOutput: false,
              declarationOutput: false,
            }),
          ],
        },
        (err, stats) => {
          if (err) return reject(err);
          if (stats?.hasErrors()) return reject(stats.toJson().errors);
          resolve();
        },
      );
    });

    const bundleContent = fs.readFileSync(path.join(outputPath, "bundle.js"), "utf-8");
    expect(bundleContent).toContain("AppService");
    expect(bundleContent).toContain("LoggerService");
  });
});
