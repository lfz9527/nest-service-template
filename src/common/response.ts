/**
 * 统一响应结构
 * httpCode — 系统层 HTTP 状态码
 * code    — 业务层状态码（成功为 0，失败为具体业务码）
 */
export class ApiResponse<T = any> {
  /** 系统层 HTTP 状态码 */
  httpCode: number;
  /** 业务层状态码 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 请求是否成功 */
  success: boolean;
  /** 返回数据 */
  remark: T | null;

  static ok<T>(data: T, message = '操作成功'): ApiResponse<T> {
    return { httpCode: 200, code: 0, message, success: true, remark: data };
  }

  static fail(httpCode: number, bizCode: number, message: string): ApiResponse<null> {
    return { httpCode, code: bizCode, message, success: false, remark: null };
  }
}
