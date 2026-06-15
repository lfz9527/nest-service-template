import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../response';

/**
 * HTTP 异常过滤器
 * 捕获所有 HttpException 及其子类异常，统一返回标准 JSON 格式的错误响应。
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * 处理捕获到的 HTTP 异常
   * @param exception 捕获到的 HttpException 实例
   * @param host      参数主机，用于切换 HTTP 上下文获取响应对象
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message;

    response.status(status).json(ApiResponse.fail(status, message));
  }
}
