import { HttpException } from '@nestjs/common';

/**
 * 业务异常
 * 统一携带 HTTP 状态码，业务码固定为 -1
 */
export class BusinessException extends HttpException {
  constructor(httpCode: number, message: string) {
    super(message, httpCode);
  }
}
