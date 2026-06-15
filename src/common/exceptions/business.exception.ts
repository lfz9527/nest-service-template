import { HttpException } from '@nestjs/common';

/**
 * 业务异常
 * 同时携带 HTTP 状态码（系统层）和业务状态码（业务层），
 * 供异常过滤器统一处理输出
 */
export class BusinessException extends HttpException {
  /** 业务状态码 */
  readonly bizCode: number;

  constructor(httpCode: number, bizCode: number, message: string) {
    super(message, httpCode);
    this.bizCode = bizCode;
  }
}
