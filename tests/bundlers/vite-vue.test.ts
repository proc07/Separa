import path from "node:path";
import { describe, expect, it } from "vitest";
import separa from "@separa/vite-plugin";

describe("Vite Plugin SFC scanning", () => {
  it("scans vue-todo project and generates TodoService registry", () => {
    const root = path.resolve(__dirname, "../../examples/vue-todo");
    const plugin = separa({
      debugOutput: false,
      declarationOutput: false,
    });

    (plugin as any).configResolved({ root });
    (plugin as any).buildStart();

    const output = (plugin as any).load("\0virtual:separa/registry");
    expect(output).toContain("TodoService");
  });

  it("scans vue-ballcraft project and generates BallcraftService registry", () => {
    const root = path.resolve(__dirname, "../../examples/vue-ballcraft");
    const plugin = separa({
      debugOutput: false,
      declarationOutput: false,
    });

    (plugin as any).configResolved({ root });
    (plugin as any).buildStart();

    const output = (plugin as any).load("\0virtual:separa/registry");
    expect(output).toContain("BallcraftService");
  });

  it("scans vue-cart project and generates Cart services registry", () => {
    const root = path.resolve(__dirname, "../../examples/vue-cart");
    const plugin = separa({
      debugOutput: false,
      declarationOutput: false,
    });

    (plugin as any).configResolved({ root });
    (plugin as any).buildStart();

    const output = (plugin as any).load("\0virtual:separa/registry");
    expect(output).toContain("CartStoreService");
    expect(output).toContain("CurrencyService");
    expect(output).toContain("TaxService");
  });
});
