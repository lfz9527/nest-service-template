import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Response } from 'express';
import { ApiResponse } from '../response';
import { BusinessException } from '../exceptions/business.exception';
import { PinoLogger } from 'nestjs-pino';
import { I18nContext, I18nTranslator } from 'nestjs-i18n';
import { PRISMA_CODES } from '../../constant';

/**
 * 全局异常过滤器
 * - HttpException / BusinessException → 通过 I18nContext 翻译 key 后返回
 * - Prisma 数据库异常 → 转为 i18n key + 插值参数，翻译后返回
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

    this.handleUnknownError(exception, request, response);
  }

  private handleHttpException(
    exception: HttpException,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const httpCode = exception.getStatus();

    if (exception instanceof BusinessException) {
      const message = this.t(exception.i18nKey, exception.i18nArgs) || exception.message;

      this.logger.warn(
        {
          statusCode: httpCode,
          method: request.method,
          url: request.url,
          i18nKey: exception.i18nKey,
        },
        message,
      );

      response.status(httpCode).json({
        ...ApiResponse.fail(message),
        code: exception.businessCode,
      });
      return;
    }

    // 普通 HttpException：尝试翻译 message，翻译失败则直接用原文
    const message = (() => {
      try {
        return this.t(exception.message) || exception.message;
      } catch {
        return exception.message;
      }
    })();

    this.logger.warn({ statusCode: httpCode, method: request.method, url: request.url }, message);

    response.status(httpCode).json(ApiResponse.fail(message));
  }

  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const { key, args } = this.resolvePrismaErrorKey(error);
    const message = this.t(key, args) || key;
    const httpCode = this.resolvePrismaHttpCode(error.code);

    this.logger.error(
      {
        prismaCode: error.code,
        target: error.meta?.target,
        method: request.method,
        url: request.url,
      },
      message,
    );

    response.status(httpCode).json(ApiResponse.fail(message));
  }

  private handlePrismaValidationError(
    _error: Prisma.PrismaClientValidationError,
    request: { method: string; url: string },
    response: Response,
  ): void {
    this.logger.error({ method: request.method, url: request.url }, 'Prisma validation error');

    response
      .status(HttpStatus.BAD_REQUEST)
      .json(ApiResponse.fail(this.t('common.bad_request') || 'common.bad_request'));
  }

  private handleUnknownError(
    error: unknown,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));

    this.logger.error({ method: request.method, url: request.url, stack: err.stack }, err.message);

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.fail(this.t('common.internal_error') || 'common.internal_error'));
  }

  /**
   * 通过 I18nContext 翻译 key
   * - I18nContext 不可用时返回 undefined（由调用方兜底）
   */
  private t(key: string, args?: Record<string, string | number>): string | undefined {
    const i18n = I18nContext.current<I18nTranslator>();
    if (!i18n) return undefined;
    try {
      return i18n.t(key as Parameters<typeof i18n.t>[0], { args }) as unknown as string;
    } catch {
      return undefined;
    }
  }

  private resolvePrismaHttpCode(code: string): number {
    switch (code) {
      case PRISMA_CODES.UNIQUE_CONSTRAINT:
        return HttpStatus.CONFLICT;
      case PRISMA_CODES.RECORD_NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case PRISMA_CODES.FOREIGN_KEY_FAILED:
      case PRISMA_CODES.CONSTRAINT_VIOLATION:
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private resolvePrismaErrorKey(error: Prisma.PrismaClientKnownRequestError): {
    key: string;
    args?: Record<string, string | number>;
  } {
    const field = (error.meta?.target as string[])?.join('、') ?? '';

    switch (error.code) {
      case PRISMA_CODES.UNIQUE_CONSTRAINT:
        return { key: 'prisma.unique_constraint', args: { field } };
      case PRISMA_CODES.RECORD_NOT_FOUND:
        return { key: 'prisma.record_not_found' };
      case PRISMA_CODES.FOREIGN_KEY_FAILED:
        return { key: 'prisma.foreign_key_failed', args: { field } };
      case PRISMA_CODES.CONSTRAINT_VIOLATION:
        return { key: 'prisma.constraint_violation' };
      case PRISMA_CODES.TABLE_NOT_FOUND:
        this.logger.error({ table: error.meta?.table }, 'Prisma: table not found');
        return { key: 'common.internal_error' };
      case PRISMA_CODES.COLUMN_NOT_FOUND:
        this.logger.error({ column: error.meta?.column }, 'Prisma: column not found');
        return { key: 'common.internal_error' };
      default:
        return { key: 'prisma.unknown_error', args: { code: error.code } };
    }
  }
}
