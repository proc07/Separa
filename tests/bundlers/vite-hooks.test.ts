import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import separa, { VIRTUAL_ID } from "@separa/plugin";

describe("@separa/plugin - Plugin hooks & HMR", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "separa-vite-hooks-test-"));
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
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src/index.ts"),
      `
        import { Service } from "@separa/core";
        @Service({ scope: "singleton" })
        export class SampleService {
          val = 1;
        }
      `,
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("handles resolveId, load, and debug/declaration file writing", () => {
    const plugin = separa() as any;
    plugin.configResolved({ root: tmpDir });

    expect(plugin.resolveId(VIRTUAL_ID)).toBe("\0virtual:separa/registry");
    expect(plugin.resolveId("other-module")).toBeUndefined();

    plugin.buildStart();

    const loaded = plugin.load("\0virtual:separa/registry");
    expect(loaded).toContain("SampleService");

    // Check debug output and declaration output files created in .separa
    expect(fs.existsSync(path.join(tmpDir, ".separa/registry.generated.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, ".separa/registry.generated.d.ts"))).toBe(true);
  });

  it("handles handleHotUpdate by rebuilding and invalidating virtual module", () => {
    const plugin = separa({ debugOutput: false, declarationOutput: false }) as any;
    plugin.configResolved({ root: tmpDir });
    plugin.buildStart();

    const mockModule = { id: "\0virtual:separa/registry" };
    const invalidateModule = vi.fn();
    const server = {
      moduleGraph: {
        getModuleById: vi.fn().mockReturnValue(mockModule),
        invalidateModule,
      },
    };

    plugin.handleHotUpdate({
      file: path.join(tmpDir, "src/index.ts"),
      server,
    });

    expect(server.moduleGraph.getModuleById).toHaveBeenCalledWith("\0virtual:separa/registry");
    expect(invalidateModule).toHaveBeenCalledWith(mockModule);
  });
});
