import type { ServiceToken, Token } from "./types";

const TOKEN_MARKER = Symbol("@separa/token");
type InternalToken<T> = Token<T> & { readonly [TOKEN_MARKER]: true };
const generatedContractTokens = new Map<string, Token<unknown>>();

/** 创建不可变的名义化 Token；Symbol 负责身份，description 只用于诊断信息。 */
export function createToken<T>(description: string): Token<T> {
  return Object.freeze({
    id: Symbol(description),
    description,
    [TOKEN_MARKER]: true as const,
  });
}

/**
 * 为编译器生成的契约取得进程内稳定 Token。不同懒加载 chunk 使用同一规范化 ID
 * 时会共享身份，同时不把应用契约暴露到全局 Symbol 注册表。
 */
export function createContractToken<T>(description: string): Token<T> {
  const existing = generatedContractTokens.get(description);
  if (existing) return existing as Token<T>;
  const token = createToken<T>(description);
  generatedContractTokens.set(description, token as Token<unknown>);
  return token;
}

/** 通过私有品牌判断服务身份是否为 Separa Token。 */
export function isToken<T>(value: ServiceToken<T>): value is Token<T> {
  return typeof value === "object" && value !== null && TOKEN_MARKER in (value as InternalToken<T>);
}

/** 返回适合错误和调试输出的服务名称。 */
export function tokenDescription(token: ServiceToken<unknown>): string {
  return isToken(token) ? token.description : token.name || "AnonymousService";
}
