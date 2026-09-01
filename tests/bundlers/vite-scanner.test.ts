import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import separa, { VIRTUAL_ID } from "@separa/plugin";

describe("@separa/plugin - Program scanning and validation", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-vite-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupProject(files: Record<string, string>, tsconfigContent?: any) {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    const tsconfig = tsconfigContent ?? {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        experimentalDecorators: true,
      },
      include: ["src/**/*"],
    };
    fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
  }

  it("scans valid services, interfaces, dependencies, and generates registry code", async () => {
    setupProject({
      "src/tokens.ts": `
        export interface ILogger {
          log(msg: string): void;
        }
      `,
      "src/logger.service.ts": `
        import { Service } from "@separa/core";
        import { ILogger } from "./tokens";

        @Service({ scope: "singleton" })
        export class ConsoleLogger implements ILogger {
          log(msg: string) { console.log(msg); }
        }
      `,
      "src/app.service.ts": `
        import { Service, Inject } from "@separa/core";
        import { ILogger } from "./tokens";

        @Service({ scope: "singleton" })
        export class AppService {
          count = 0;
          constructor(readonly logger: ILogger) {}
          run() {
            this.logger.log("running");
          }
        }
      `,
    });

    const plugin = separa({ debugOutput: false, declarationOutput: false }) as any;
    plugin.configResolved({ root: tmpDir });
    plugin.buildStart();

    const loaded = plugin.load("\0virtual:separa/registry");
    expect(loaded).toBeDefined();
    expect(loaded).toContain("ConsoleLogger as Service");
    expect(loaded).toContain("AppService as Service");
    expect(loaded).toContain("serviceDefinitions");
    expect(loaded).toContain("serviceManifest");
  });

  it("detects circular dependencies and throws descriptive error", () => {
    setupProject({
      "src/a.service.ts": `
        import { Service } from "@separa/core";
        import { BService } from "./b.service";

        @Service()
        export class AService {
          constructor(readonly b: BService) {}
        }
      `,
      "src/b.service.ts": `
        import { Service } from "@separa/core";
        import { AService } from "./a.service";

        @Service()
        export class BService {
          constructor(readonly a: AService) {}
        }
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("Circular service dependency detected");
  });

  it("throws error when service is not exported", () => {
    setupProject({
      "src/unexported.service.ts": `
        import { Service } from "@separa/core";

        @Service()
        class PrivateService {}
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("must be exported");
  });

  it("throws error on duplicate explicit tokens", () => {
    setupProject({
      "src/token.ts": `
        import { createToken } from "@separa/core";
        export const MyToken = createToken("dup");
      `,
      "src/s1.service.ts": `
        import { Service } from "@separa/core";
        import { MyToken } from "./token";

        @Service({ token: MyToken, multi: false })
        export class S1 {}
      `,
      "src/s2.service.ts": `
        import { Service } from "@separa/core";
        import { MyToken } from "./token";

        @Service({ token: MyToken, multi: false })
        export class S2 {}
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("Duplicate explicit Token");
  });

  it("throws error on multiple ambiguous implementations without qualifier", () => {
    setupProject({
      "src/contract.ts": `
        export interface IPlugin {
          name: string;
        }
      `,
      "src/p1.service.ts": `
        import { Service } from "@separa/core";
        import { IPlugin } from "./contract";

        @Service()
        export class Plugin1 implements IPlugin {
          name = "1";
        }
      `,
      "src/p2.service.ts": `
        import { Service } from "@separa/core";
        import { IPlugin } from "./contract";

        @Service()
        export class Plugin2 implements IPlugin {
          name = "2";
        }
      `,
      "src/consumer.service.ts": `
        import { Service } from "@separa/core";
        import { IPlugin } from "./contract";

        @Service()
        export class Consumer {
          constructor(readonly plugin: IPlugin) {}
        }
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("Multiple implementations for");
  });

  it("resolves multiple implementations when @InjectMany or array type is used", () => {
    setupProject({
      "src/contract.ts": `
        export interface IPlugin {
          name: string;
        }
      `,
      "src/p1.service.ts": `
        import { Service } from "@separa/core";
        import { IPlugin } from "./contract";

        @Service({ multi: true })
        export class Plugin1 implements IPlugin {
          name = "1";
        }
      `,
      "src/p2.service.ts": `
        import { Service } from "@separa/core";
        import { IPlugin } from "./contract";

        @Service({ multi: true })
        export class Plugin2 implements IPlugin {
          name = "2";
        }
      `,
      "src/consumer.service.ts": `
        import { Service, InjectMany } from "@separa/core";
        import { IPlugin } from "./contract";

        @Service()
        export class Consumer {
          constructor(readonly plugins: IPlugin[]) {}
        }
      `,
    });

    const plugin = separa({ debugOutput: false, declarationOutput: false }) as any;
    plugin.configResolved({ root: tmpDir });
    plugin.buildStart();

    const loaded = plugin.load("\0virtual:separa/registry");
    expect(loaded).toContain("container.getAll(");
  });

  it("filters services by profile", () => {
    setupProject({
      "src/dev.service.ts": `
        import { Service } from "@separa/core";
        @Service({ profile: "dev" })
        export class DevService {}
      `,
      "src/prod.service.ts": `
        import { Service } from "@separa/core";
        @Service({ profile: "prod" })
        export class ProdService {}
      `,
    });

    const plugin = separa({ profile: "dev", debugOutput: false, declarationOutput: false }) as any;
    plugin.configResolved({ root: tmpDir });
    plugin.buildStart();

    const loaded = plugin.load("\0virtual:separa/registry");
    expect(loaded).toContain("DevService");
    expect(loaded).not.toContain("ProdService");
  });
});

describe("@separa/plugin - Advanced diagnostics and entry reachability", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-vite-adv-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupProject(files: Record<string, string>) {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    const tsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        experimentalDecorators: true,
      },
      include: ["src/**/*"],
    };
    fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
  }

  it("filters services based on entries reachable graph", () => {
    setupProject({
      "src/shared.service.ts": `
        import { Service } from "@separa/core";
        @Service({ scope: "singleton" })
        export class SharedService {}
      `,
      "src/used.service.ts": `
        import { Service } from "@separa/core";
        import { SharedService } from "./shared.service";
        @Service({ scope: "singleton" })
        export class UsedService {
          constructor(readonly shared: SharedService) {}
        }
      `,
      "src/unused.service.ts": `
        import { Service } from "@separa/core";
        @Service({ scope: "singleton" })
        export class UnusedService {}
      `,
      "src/main.ts": `
        import { UsedService } from "./used.service";
      `,
    });

    const plugin = separa({
      entries: ["src/main.ts"],
      debugOutput: false,
      declarationOutput: false,
    }) as any;

    plugin.configResolved({ root: tmpDir });
    plugin.buildStart();

    const loaded = plugin.load("\0virtual:separa/registry");
    expect(loaded).toContain("UsedService");
    expect(loaded).toContain("SharedService");
    expect(loaded).not.toContain("UnusedService");
  });

  it("detects inherited reactive member conflicts", () => {
    setupProject({
      "src/conflict.service.ts": `
        import { Service } from "@separa/core";
        export class BaseService {
          name = "base";
        }
        @Service()
        export class SubService extends BaseService {
          get name() { return "sub"; }
        }
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("Inherited reactive member conflict");
  });

  it("detects duplicate qualifier for contract implementations", () => {
    setupProject({
      "src/contract.ts": `
        export interface IDriver {}
      `,
      "src/d1.service.ts": `
        import { Service } from "@separa/core";
        import { IDriver } from "./contract";
        @Service({ qualifier: "primary" })
        export class Driver1 implements IDriver {}
      `,
      "src/d2.service.ts": `
        import { Service } from "@separa/core";
        import { IDriver } from "./contract";
        @Service({ qualifier: "primary" })
        export class Driver2 implements IDriver {}
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("Duplicate qualifier");
  });

  it("detects missing implementation for required contract", () => {
    setupProject({
      "src/contract.ts": `
        export interface IMissing {}
      `,
      "src/consumer.service.ts": `
        import { Service } from "@separa/core";
        import { IMissing } from "./contract";
        @Service()
        export class Consumer {
          constructor(readonly dep: IMissing) {}
        }
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("Missing implementation for");
  });

  it("resolves defaultBindings and qualified dependencies in generated code", () => {
    setupProject({
      "src/contract.ts": `
        export interface ITheme {
          name: string;
        }
      `,
      "src/dark.service.ts": `
        import { Service } from "@separa/core";
        import { ITheme } from "./contract";
        @Service({ qualifier: "dark" })
        export class DarkTheme implements ITheme {
          name = "dark";
        }
      `,
      "src/light.service.ts": `
        import { Service } from "@separa/core";
        import { ITheme } from "./contract";
        @Service({ qualifier: "light" })
        export class LightTheme implements ITheme {
          name = "light";
        }
      `,
      "src/app.service.ts": `
        import { Service, Qualifier } from "@separa/core";
        import { ITheme } from "./contract";
        @Service()
        export class AppService {
          constructor(@Qualifier("dark") readonly theme: ITheme) {}
        }
      `,
    });

    const plugin = separa({
      debugOutput: false,
      declarationOutput: false,
    }) as any;

    plugin.configResolved({ root: tmpDir });
    plugin.buildStart();

    const loaded = plugin.load("\0virtual:separa/registry");
    expect(loaded).toContain('container.getQualified(');
    expect(loaded).toContain('"dark"');
  });
});

describe("@separa/plugin - Syntax errors and edge cases", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-vite-edge-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupProject(files: Record<string, string>) {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    const tsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        experimentalDecorators: true,
      },
      include: ["src/**/*"],
    };
    fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
  }

  it("throws error when @Service({ profile }) is not a string or string array", () => {
    setupProject({
      "src/bad-profile.service.ts": `
        import { Service } from "@separa/core";
        @Service({ profile: 123 as any })
        export class BadProfileService {}
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("requires a string or string array");
  });

  it("throws error when @Qualifier() is called with non-string literal", () => {
    setupProject({
      "src/bad-qual.service.ts": `
        import { Service, Qualifier } from "@separa/core";
        export interface IDep {}
        @Service()
        export class BadQualService {
          constructor(@Qualifier(123 as any) readonly dep: IDep) {}
        }
      `,
    });

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("requires a string");
  });

  it("throws error when tsconfig.json is missing or corrupted", () => {
    setupProject({
      "src/sample.ts": "export class S {}",
    });
    // Remove tsconfig
    fs.unlinkSync(path.join(tmpDir, "tsconfig.json"));

    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });
    expect(() => plugin.buildStart()).toThrow("Cannot find tsconfig.json");
  });

  it("generates declaration file with typed handles for single and multiple implementations", () => {
    setupProject({
      "src/contract.ts": `
        export interface IServiceA {}
        export interface IServiceB {}
      `,
      "src/service-a.ts": `
        import { Service } from "@separa/core";
        import { IServiceA } from "./contract";
        @Service()
        export class ServiceA implements IServiceA {}
      `,
      "src/service-b1.ts": `
        import { Service } from "@separa/core";
        import { IServiceB } from "./contract";
        @Service({ multi: true })
        export class ServiceB1 implements IServiceB {}
      `,
      "src/service-b2.ts": `
        import { Service } from "@separa/core";
        import { IServiceB } from "./contract";
        @Service({ multi: true })
        export class ServiceB2 implements IServiceB {}
      `,
    });

    const plugin = separa({
      debugOutput: ".separa/out.ts",
      declarationOutput: ".separa/out.d.ts",
    }) as any;

    plugin.configResolved({ root: tmpDir });
    plugin.buildStart();

    const dtsContent = fs.readFileSync(path.join(tmpDir, ".separa/out.d.ts"), "utf-8");
    expect(dtsContent).toContain("readonly \"IServiceA\": ServiceHandle<");
    expect(dtsContent).toContain("readonly \"IServiceBMany\": ServiceCollectionHandle<");
  });
});
