/**
 * 系统预置角色编码常量
 * 注意：USER 是角色 code 字符串，非 Prisma User 模型
 */
/** 超级管理员 — 拥有系统全部权限 */
export const SUPER_ADMIN = 'super_admin';
/** 普通用户角色 — 仅拥有基本访问权限（此为角色编码，非 Prisma User 模型） */
export const USER = 'user';
