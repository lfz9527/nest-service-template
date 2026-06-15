import { SUCCESS, FAIL } from './code';

/**
 * 统一响应结构
 * code — 业务层状态码（0=成功，-1=失败）
 */
export class ApiResponse<T = any> {
  /** 业务层状态码：0 成功，-1 失败 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 请求是否成功 */
  success: boolean;
  /** 返回数据 */
  remark: T | null;

  static success<T>(data: T, message = '操作成功'): ApiResponse<T> {
    return { code: SUCCESS, message, success: true, remark: data };
  }

  static fail(message: string): ApiResponse<null> {
    return { code: FAIL, message, success: false, remark: null };
  }
}
