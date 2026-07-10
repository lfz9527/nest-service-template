/**
 * Session 模式常量
 * 与环境变量 SESSION_MODE 的值对应，统一引用避免硬编码字符串
 */
export const SESSION_MODE = {
  /** 单机登录 — 一个账号仅一个活跃 Session */
  SINGLE: 'single',
  /** 多机登录 — 允许多 Session 并存 */
  MULTI: 'multi',
} as const;
