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

// 将 NestJS HttpStatus 枚举统一出口，供全项目使用
export { HttpStatus };

// 实体状态枚举（替代 status === 1 这类魔术数）
export enum EntityStatus {
  DISABLED = 0,
  ENABLED = 1,
}
