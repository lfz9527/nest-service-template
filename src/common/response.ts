/**
 * 统一响应结构
 * 所有接口返回数据均使用此格式，确保前端处理统一
 */
export class ApiResponse<T = any> {
  /** HTTP 状态码 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 请求是否成功 */
  success: boolean;
  /** 返回数据 / 备注信息 */
  remark: T | null;

  static ok<T>(data: T, message = '操作成功'): ApiResponse<T> {
    return { code: 200, message, success: true, remark: data };
  }

  static fail(code: number, message: string): ApiResponse<null> {
    return { code, message, success: false, remark: null };
  }
}
