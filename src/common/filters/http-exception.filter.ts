import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../response';
import { PinoLogger } from 'nestjs-pino';

/**
 * HTTP 异常过滤器
 * 异常统一返回 { code: -1, message, success: false, remark: null }
 * 同时通过 PinoLogger 记录错误日志
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse<Response>();
    const httpCode = exception.getStatus();
    const message = exception.message;

    this.logger.warn(
      {
        statusCode: httpCode,
        method: request.method,
        url: request.url,
      },
      message,
    );

    response.status(httpCode).json(ApiResponse.fail(message));
  }
}
