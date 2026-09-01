import { describe, it, expect } from "vitest";
import {
  createToken,
  createContractToken,
  isToken,
  tokenDescription,
} from "@separa/core";

describe("@separa/core - tokens", () => {
  it("creates standard tokens and extracts description", () => {
    const token = createToken<{ value: number }>("my-token");
    expect(isToken(token)).toBe(true);
    expect(tokenDescription(token)).toBe("my-token");
  });

  it("handles string descriptions, class names, and anonymous functions", () => {
    const customToken = createToken("custom-desc");
    expect(isToken(customToken)).toBe(true);
    expect(tokenDescription(customToken)).toBe("custom-desc");

    class SampleClass {}
    expect(isToken(SampleClass as any)).toBe(false);
    expect(tokenDescription(SampleClass as any)).toBe("SampleClass");

    // Anonymous function without a name
    const anon = function () {};
    Object.defineProperty(anon, "name", { value: "" });
    expect(tokenDescription(anon as any)).toBe("AnonymousService");
  });

  it("creates contract tokens and caches by description", () => {
    const id = "@app/services/logger#ILogger";
    const contract1 = createContractToken<any>(id);
    const contract2 = createContractToken<any>(id);
    expect(isToken(contract1)).toBe(true);
    expect(contract1).toBe(contract2);
    expect(tokenDescription(contract1)).toBe(id);
  });

  it("identifies non-tokens correctly", () => {
    expect(isToken(null as any)).toBe(false);
    expect(isToken(undefined as any)).toBe(false);
    expect(isToken(123 as any)).toBe(false);
    expect(isToken("str" as any)).toBe(false);
    expect(isToken({} as any)).toBe(false);
  });
});
