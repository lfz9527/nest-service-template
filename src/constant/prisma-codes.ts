/**
 * Prisma 错误码常量
 * 统一引用避免硬编码 Prisma 错误码字符串
 */
export const PRISMA_CODES = {
  /** 唯一约束冲突 */
  UNIQUE_CONSTRAINT: 'P2002',
  /** 记录未找到 */
  RECORD_NOT_FOUND: 'P2025',
  /** 外键约束失败 */
  FOREIGN_KEY_FAILED: 'P2003',
  /** 约束违反 */
  CONSTRAINT_VIOLATION: 'P2014',
  /** 表未找到 */
  TABLE_NOT_FOUND: 'P2021',
  /** 列未找到 */
  COLUMN_NOT_FOUND: 'P2022',
} as const;
