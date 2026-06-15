import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../response';

/**
 * HTTP 异常过滤器
 * 所有异常统一返回 { code: -1, message, success: false, remark: null }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const httpCode = exception.getStatus();
    const message = exception.message;

    response.status(httpCode).json(ApiResponse.fail(message));
  }
}
