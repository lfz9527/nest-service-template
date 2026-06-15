import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../response';
import { BusinessException } from '../exceptions/business.exception';
import { BAD_REQUEST } from '../code';

/**
 * HTTP 异常过滤器
 * 捕获所有 HttpException 及其子类异常，统一返回标准 JSON 格式的错误响应。
 * 区分系统码（httpCode）与业务码（code）。
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const httpCode = exception.getStatus();
    const message = exception.message;

    // BusinessException 携带业务码，普通 HttpException 使用 HTTP 状态码作为业务码
    const bizCode = exception instanceof BusinessException ? exception.bizCode : BAD_REQUEST;

    response.status(httpCode).json(ApiResponse.fail(httpCode, bizCode, message));
  }
}
