import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

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
    // 获取 HTTP 状态码（如 401、403、404、500 等）
    const status = exception.getStatus();
    // 获取异常消息文本
    const message = exception.message;

    // 统一 JSON 响应结构：{ code, message, data }
    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
