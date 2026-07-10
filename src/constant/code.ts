import { HttpStatus } from '@nestjs/common';

// 业务响应码（保持向后兼容）
/** 成功 */
export const SUCCESS = 0;
/** 失败 */
export const FAIL = -1;
/** 未登录 */
export const UNAUTHORIZED = 401;
/** 权限不足 */
export const FORBIDDEN = 403;
/** 请求过于频繁 */
export const TOO_MANY_REQUESTS = 429;
/** 已在其他设备登录（被踢下线） */
export const KICKED_OFF = 402;

// 将 NestJS HttpStatus 枚举统一出口，供全项目使用
export { HttpStatus };

/** 实体业务状态枚举，用于 User / Role / Menu 的 status 字段 */
export enum EntityStatus {
  /** 禁用 — 用户无法登录，角色不参与权限校验，菜单不在树中展示 */
  DISABLED = 0,
  /** 启用 — 正常使用中 */
  ENABLED = 1,
}
