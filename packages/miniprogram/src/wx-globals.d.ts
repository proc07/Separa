/**
 * 微信小程序全局函数的最小类型声明存根。
 * 完整类型由 @types/wechat-miniprogram 提供；
 * 这里仅声明 Page() 和 Component() 的宽松签名，
 * 使 @separa/miniprogram 无需强制依赖宿主项目的 @types/wechat-miniprogram。
 */

/* eslint-disable no-var */
declare function Page(options: Record<string, unknown>): void;
declare function Component(options: Record<string, unknown>): void;
