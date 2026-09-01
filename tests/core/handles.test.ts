import { describe, it, expect, vi } from "vitest";
import {
  createToken,
  createServiceHandle,
  createServiceCollectionHandle,
  identifierToken,
} from "@separa/core";

describe("@separa/core - handles", () => {
  const token = createToken<{ run(): string }>("runner");

  it("creates and resolves ServiceHandle with async and sync containers", async () => {
    const handle = createServiceHandle("runner-id", token, "primary");
    expect(handle.id).toBe("runner-id");
    expect(handle.token).toBe(token);
    expect(identifierToken(handle)).toBe(token);

    // Container WITH async methods
    const asyncContainer = {
      get: vi.fn(),
      getQualified: vi.fn().mockReturnValue({ run: () => "primary-run" }),
      getQualifiedAsync: vi.fn().mockResolvedValue({ run: () => "async-primary-run" }),
      getAsync: vi.fn(),
      getAll: vi.fn(),
      getAllAsync: vi.fn(),
    };

    expect(handle.resolve(asyncContainer as any).run()).toBe("primary-run");
    expect((await handle.resolveAsync(asyncContainer as any)).run()).toBe("async-primary-run");

    // Container WITHOUT async methods (sync fallback)
    const syncContainer = {
      get: vi.fn(),
      getQualified: vi.fn().mockReturnValue({ run: () => "sync-qualified" }),
      getAll: vi.fn(),
    };
    expect(handle.resolve(syncContainer as any).run()).toBe("sync-qualified");
    expect((await handle.resolveAsync(syncContainer as any)).run()).toBe("sync-qualified");
  });

  it("creates and resolves ServiceHandle without qualifier (sync and async fallback)", async () => {
    const handle = createServiceHandle("runner-id", token);

    const asyncContainer = {
      get: vi.fn().mockReturnValue({ run: () => "default-run" }),
      getAsync: vi.fn().mockResolvedValue({ run: () => "async-default-run" }),
    };
    expect(handle.resolve(asyncContainer as any).run()).toBe("default-run");
    expect((await handle.resolveAsync(asyncContainer as any)).run()).toBe("async-default-run");

    const syncOnlyContainer = {
      get: vi.fn().mockReturnValue({ run: () => "sync-only-run" }),
    };
    expect(handle.resolve(syncOnlyContainer as any).run()).toBe("sync-only-run");
    expect((await handle.resolveAsync(syncOnlyContainer as any)).run()).toBe("sync-only-run");
  });

  it("creates and resolves ServiceCollectionHandle (sync and async fallback)", async () => {
    const colHandle = createServiceCollectionHandle("runner-id", token);
    expect(colHandle.id).toBe("runner-id");
    expect(colHandle.token).toBe(token);
    expect(identifierToken(colHandle as any)).toBe(token);

    const asyncContainer = {
      getAll: vi.fn().mockReturnValue([{ run: () => "1" }, { run: () => "2" }]),
      getAllAsync: vi.fn().mockResolvedValue([{ run: () => "1" }, { run: () => "2" }]),
    };
    expect(colHandle.resolve(asyncContainer as any)).toHaveLength(2);
    expect(await colHandle.resolveAsync(asyncContainer as any)).toHaveLength(2);

    const syncOnlyContainer = {
      getAll: vi.fn().mockReturnValue([{ run: () => "1" }]),
    };
    expect(colHandle.resolve(syncOnlyContainer as any)).toHaveLength(1);
    expect(await colHandle.resolveAsync(syncOnlyContainer as any)).toHaveLength(1);
  });

  it("identifierToken returns target if already a token or constructor", () => {
    expect(identifierToken(token)).toBe(token);
    class MyClass {}
    expect(identifierToken(MyClass as any)).toBe(MyClass);
    expect(identifierToken(null as any)).toBeNull();
  });
});
