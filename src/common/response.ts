import { SUCCESS, FAIL } from './code';
import { MSG } from './messages';

/**
 * 统一响应结构
 * code    — 业务层状态码（0=成功，-1=失败）
 * data    — 业务数据，成功时存放返回数据
 */
export class ApiResponse<T = unknown> {
  code: number;
  message: string;
  success: boolean;
  data: T | null;

  static success<T>(data: T, message = MSG.COMMON.SUCCESS): ApiResponse<T> {
    return { code: SUCCESS, message, success: true, data };
  }

  static fail(message: string): ApiResponse<null> {
    return { code: FAIL, message, success: false, data: null };
  }
}

/** 分页列表数据结构 */
export class ListResult<T = unknown> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;

  constructor(list: T[], total: number, page: number, pageSize: number) {
    this.list = list;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
  }
}
