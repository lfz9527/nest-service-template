import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Response } from 'express';
import { ApiResponse } from '../response';
import { FAIL } from '../code';
import { BusinessException } from '../exceptions/business.exception';
import { PinoLogger } from 'nestjs-pino';

/**
 * 全局异常过滤器
 * - HttpException / BusinessException → 按业务状态码返回
 * - Prisma 数据库异常 → 转换为友好中文提示
 * - 其他未知异常 → 统一 500，避免泄露内部细节
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      this.handleHttpException(exception, request, response);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.handlePrismaError(exception, request, response);
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.handlePrismaValidationError(exception, request, response);
      return;
    }

    // 未知异常 — 统一 500，记录完整错误日志
    this.handleUnknownError(exception, request, response);
  }

  /**
   * 处理 HTTP 异常（含 BusinessException）
   */
  private handleHttpException(
    exception: HttpException,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const httpCode = exception.getStatus();
    const message = exception.message;

    this.logger.warn(
      { statusCode: httpCode, method: request.method, url: request.url },
      message,
    );

    const businessCode =
      exception instanceof BusinessException ? exception.businessCode : FAIL;
    response.status(httpCode).json({ ...ApiResponse.fail(message), code: businessCode });
  }

  /**
   * 处理 Prisma 已知请求错误（如唯一约束、外键冲突等）
   */
  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const message = this.translatePrismaError(error);

    this.logger.error(
      {
        prismaCode: error.code,
        target: error.meta?.target,
        method: request.method,
        url: request.url,
      },
      message,
    );

    response.status(HttpStatus.BAD_REQUEST).json(ApiResponse.fail(message));
  }

  /**
   * 处理 Prisma 校验异常（如查询参数类型不匹配）
   */
  private handlePrismaValidationError(
    _error: Prisma.PrismaClientValidationError,
    request: { method: string; url: string },
    response: Response,
  ): void {
    this.logger.error(
      { method: request.method, url: request.url },
      'Prisma validation error',
    );

    response
      .status(HttpStatus.BAD_REQUEST)
      .json(ApiResponse.fail('请求参数有误'));
  }

  /**
   * 处理未预期的未知异常
   */
  private handleUnknownError(
    error: unknown,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const err =
      error instanceof Error ? error : new Error(String(error));

    this.logger.error(
      { method: request.method, url: request.url, stack: err.stack },
      err.message,
    );

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.fail('服务器内部错误'));
  }

  /**
   * 将 Prisma 错误码映射为可读的中文提示
   */
  private translatePrismaError(error: Prisma.PrismaClientKnownRequestError): string {
    const target = (error.meta?.target as string[])?.join('、') ?? '';

    switch (error.code) {
      case 'P2002':
        return target ? `${target} 已存在，请勿重复添加` : '数据已存在，请勿重复添加';
      case 'P2025':
        return '目标记录不存在，可能已被删除';
      case 'P2003':
        return target ? `操作失败：${target} 存在关联数据无法删除` : '存在关联数据，无法执行此操作';
      case 'P2014':
        return '违反数据关联约束，请检查关联数据';
      case 'P2021':
        this.logger.error({ table: error.meta?.table }, 'Prisma: table not found');
        return '服务器内部错误';
      case 'P2022':
        this.logger.error({ column: error.meta?.column }, 'Prisma: column not found');
        return '服务器内部错误';
      default:
        return `数据库操作异常 (${error.code})`;
    }
  }
}
