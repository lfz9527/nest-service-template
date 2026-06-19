import { HttpException } from '@nestjs/common';
import { FAIL } from '../../constant';

/**
 * 业务异常
 * 携带 HTTP 状态码与业务错误码，过滤器会将其写入响应
 */
export class BusinessException extends HttpException {
  readonly businessCode: number;

  constructor(httpCode: number, message: string, businessCode: number = FAIL) {
    super(message, httpCode);
    this.businessCode = businessCode;
  }
}
