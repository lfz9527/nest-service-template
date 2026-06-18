import { Session } from 'express-session';

/**
 * 扩展的 Session 类型
 * 在 express-session 原类型基础上增加业务字段：
 * - userId:   当前登录用户的 ID
 * - captcha:  登录验证码（临时存储用于校验）
 */
export type AppSession = Session & { userId?: number; captcha?: string };

export interface MenuTreeNode {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  children?: MenuTreeNode[];
}
