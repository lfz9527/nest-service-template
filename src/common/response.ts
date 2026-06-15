import { SUCCESS, FAIL } from './code';

/**
 * 统一响应结构
 * code    — 业务层状态码（0=成功，-1=失败）
 * data    — 业务数据，成功时存放返回数据
 * remark  — 备注信息，仅用于补充说明
 */
export class ApiResponse<T = any> {
  /** 业务层状态码：0 成功，-1 失败 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 请求是否成功 */
  success: boolean;
  /** 业务数据 */
  data: T | null;
  /** 备注信息 */
  remark: string | null;

  static success<T>(data: T, message = '操作成功'): ApiResponse<T> {
    return { code: SUCCESS, message, success: true, data, remark: null };
  }

  static fail(message: string): ApiResponse<null> {
    return { code: FAIL, message, success: false, data: null, remark: null };
  }
}
