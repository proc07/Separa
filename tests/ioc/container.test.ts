import { describe, it, expect, vi } from "vitest";
import { createContainer } from "@separa/ioc-inversify";
import {
  createToken,
  createContractToken,
  createServiceHandle,
  createServiceCollectionHandle,
  defineDecoratedService,
  Service,
} from "@separa/core";

describe("@separa/ioc-inversify - Container", () => {
  it("resolves singleton, transient, and request scoped services", () => {
    let singletonCount = 0;
    let transientCount = 0;
    let requestCount = 0;

    @Service({ scope: "singleton" })
    class SingletonService {
      readonly id = ++singletonCount;
    }

    @Service({ scope: "transient" })
    class TransientService {
      readonly id = ++transientCount;
    }

    @Service({ scope: "request" })
    class RequestService {
      readonly id = ++requestCount;
    }

    const container = createContainer({
      definitions: [
        defineDecoratedService(SingletonService),
        defineDecoratedService(TransientService),
        defineDecoratedService(RequestService),
      ],
    });

    // Singleton gives same instance
    const s1 = container.get(SingletonService);
    const s2 = container.get(SingletonService);
    expect(s1).toBe(s2);
    expect(s1.id).toBe(1);

    // Transient gives new instance
    const t1 = container.get(TransientService);
    const t2 = container.get(TransientService);
    expect(t1).not.toBe(t2);
    expect(t1.id).toBe(1);
    expect(t2.id).toBe(2);

    // Inversify request scope gives instance per resolution request
    const r1 = container.get(RequestService);
    const r2 = container.get(RequestService);
    expect(r1).not.toBe(r2);

    // Child scope created via createScope inherits root singletons
    const childScope = container.createScope();
    expect(childScope.get(SingletonService)).toBe(s1);
  });

  it("resolves ServiceHandle and ServiceCollectionHandle", () => {
    interface IWorker {
      work(): string;
    }
    const WorkerToken = createContractToken<IWorker>("IWorker");

    @Service({ scope: "singleton", token: WorkerToken })
    class FastWorker implements IWorker {
      work() {
        return "fast";
      }
    }

    const handle = createServiceHandle("fast-worker", WorkerToken);

    const container = createContainer({
      definitions: [defineDecoratedService(FastWorker)],
    });

    const resolved = container.get(handle);
    expect(resolved.work()).toBe("fast");
  });

  it("handles multi-binding with getAll() and collection handles", () => {
    const PluginToken = createToken<{ name: string }>("plugin");

    @Service({ multi: true, token: PluginToken })
    class PluginA {
      name = "A";
    }

    @Service({ multi: true, token: PluginToken })
    class PluginB {
      name = "B";
    }

    const colHandle = createServiceCollectionHandle("plugins", PluginToken);

    const container = createContainer({
      definitions: [
        defineDecoratedService(PluginA),
        defineDecoratedService(PluginB),
      ],
    });

    const plugins = container.getAll(PluginToken);
    expect(plugins).toHaveLength(2);
    expect(plugins.map((p) => p.name)).toEqual(["A", "B"]);

    const fromHandle = colHandle.resolve(container);
    expect(fromHandle).toHaveLength(2);
  });

  it("handles qualified bindings and tryGet / tryGetQualified", () => {
    const StorageToken = createToken<{ read(): string }>("storage");

    @Service({ qualifier: "local", token: StorageToken })
    class LocalStorage {
      read() {
        return "local-data";
      }
    }

    @Service({ qualifier: "remote", token: StorageToken })
    class RemoteStorage {
      read() {
        return "remote-data";
      }
    }

    const container = createContainer({
      definitions: [
        defineDecoratedService(LocalStorage),
        defineDecoratedService(RemoteStorage),
      ],
    });

    expect(container.getQualified(StorageToken, "local").read()).toBe("local-data");
    expect(container.getQualified(StorageToken, "remote").read()).toBe("remote-data");
    expect(container.tryGetQualified(StorageToken, "local")?.read()).toBe("local-data");
    expect(container.tryGetQualified(StorageToken, "missing")).toBeUndefined();

    // tryGet for non-existent token
    const MissingToken = createToken("missing");
    expect(container.tryGet(MissingToken)).toBeUndefined();
  });

  it("throws descriptive error when token is not bound", () => {
    const UnknownToken = createToken("unknown");
    const container = createContainer();
    expect(() => container.get(UnknownToken)).toThrow("Failed to resolve unknown");
  });

  it("delegates resolution to parent container across all sync and async methods", async () => {
    const ParentToken = createToken<{ val: string }>("parentToken");
    const QualToken = createToken<{ val: string }>("qualToken");

    @Service({ scope: "singleton", token: ParentToken })
    class ParentService {
      val = "parent-val";
    }

    @Service({ qualifier: "parentQ", token: QualToken })
    class ParentQualService {
      val = "parent-qual";
    }

    const parent = createContainer({
      definitions: [
        defineDecoratedService(ParentService),
        defineDecoratedService(ParentQualService),
      ],
    });

    const child = parent.createScope();

    // Sync delegation
    expect(child.get(ParentToken).val).toBe("parent-val");
    expect(child.tryGet(ParentToken)?.val).toBe("parent-val");
    expect(child.getQualified(QualToken, "parentQ").val).toBe("parent-qual");
    expect(child.tryGetQualified(QualToken, "parentQ")?.val).toBe("parent-qual");
    expect(child.getAll(ParentToken)).toHaveLength(1);

    // Async delegation
    expect((await child.getAsync(ParentToken)).val).toBe("parent-val");
    expect((await child.getQualifiedAsync(QualToken, "parentQ")).val).toBe("parent-qual");
    expect(await child.getAllAsync(ParentToken)).toHaveLength(1);
  });

  it("asserts active container and throws when disposed", async () => {
    const Tok = createToken("tok");
    const container = createContainer();
    await container.dispose();

    expect(() => container.get(Tok)).toThrow("The Separa container has been disposed.");
    expect(() => container.tryGet(Tok)).toThrow("The Separa container has been disposed.");
    expect(() => container.getAll(Tok)).toThrow("The Separa container has been disposed.");
    expect(() => container.tryGetQualified(Tok, "q")).toThrow("The Separa container has been disposed.");
    expect(() => container.register({} as any)).toThrow("The Separa container has been disposed.");
    expect(() => container.loadModule({} as any)).toThrow("The Separa container has been disposed.");
    await expect(() => container.getAsync(Tok)).rejects.toThrow("The Separa container has been disposed.");
    await expect(() => container.getAllAsync(Tok)).rejects.toThrow("The Separa container has been disposed.");
  });
});
