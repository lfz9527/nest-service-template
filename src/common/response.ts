import { SUCCESS, FAIL } from './code';

/**
 * 统一响应结构
 * code    — 业务层状态码（0=成功，-1=失败）
 * data    — 业务数据，成功时存放返回数据
 */
export class ApiResponse<T = unknown> {
  /** 业务层状态码：0 成功，-1 失败 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 请求是否成功 */
  success: boolean;
  /** 业务数据 */
  data: T | null;

  static success<T>(data: T, message = '操作成功'): ApiResponse<T> {
    return { code: SUCCESS, message, success: true, data };
  }

  static fail(message: string): ApiResponse<null> {
    return { code: FAIL, message, success: false, data: null };
  }
}

/** 分页列表数据结构 */
export class ListResult<T = unknown> {
  /** 当前页数据 */
  list: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;

  constructor(list: T[], total: number, page: number, pageSize: number) {
    this.list = list;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
  }
}
