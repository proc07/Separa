// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { rspack } from "@rspack/core";
import separaRspack from "@separa/vite-plugin/rspack";
import { rspack as separaRspackNamed } from "@separa/vite-plugin";

describe("Rspack Bundler Plugin Integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-rspack-test-"));
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

    // Payment Service
    fs.writeFileSync(
      path.join(tmpDir, "src/payment.service.ts"),
      `
        import { Service } from "@separa/core";
        @Service({ scope: "singleton" })
        export class PaymentService {
          currency = "USD";
        }
      `,
    );

    // Order Service with Autowired
    fs.writeFileSync(
      path.join(tmpDir, "src/order.service.ts"),
      `
        import { Service, Autowired } from "@separa/core";
        import { PaymentService } from "./payment.service";

        @Service({ scope: "singleton" })
        export class OrderService {
          @Autowired()
          payment!: PaymentService;

          orderId = 1001;
        }
      `,
    );

    // Entry point importing virtual registry
    fs.writeFileSync(
      path.join(tmpDir, "src/index.ts"),
      `
        import { serviceDefinitions } from "virtual:separa/registry";
        import { OrderService } from "./order.service";

        export { serviceDefinitions, OrderService };
      `,
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("bundles application and resolves virtual:separa/registry with subpath export", async () => {
    const outputPath = path.join(tmpDir, "dist");

    await new Promise<void>((resolve, reject) => {
      rspack(
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
            separaRspack({
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
    expect(bundleContent).toContain("OrderService");
    expect(bundleContent).toContain("PaymentService");
    expect(bundleContent).toContain("serviceDefinitions");
  });

  it("works with named export from main package", async () => {
    const outputPath = path.join(tmpDir, "dist-named");

    await new Promise<void>((resolve, reject) => {
      rspack(
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
            separaRspackNamed({
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
    expect(bundleContent).toContain("OrderService");
    expect(bundleContent).toContain("PaymentService");
  });
});
