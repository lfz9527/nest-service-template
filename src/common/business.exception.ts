import { HttpException } from '@nestjs/common';
import { FAIL } from '../constant';

/**
 * 业务异常
 * 携带 HTTP 状态码、i18n 翻译 key 与可选的插值参数。
 * HttpExceptionFilter 会通过 I18nContext 将 key 翻译为最终消息。
 */
export class BusinessException extends HttpException {
  readonly businessCode: number;
  readonly i18nKey: string;
  readonly i18nArgs?: Record<string, string | number>;

  constructor(
    httpCode: number,
    i18nKey: string,
    options?: {
      businessCode?: number;
      args?: Record<string, string | number>;
    },
  ) {
    super(i18nKey, httpCode);
    this.i18nKey = i18nKey;
    this.businessCode = options?.businessCode ?? FAIL;
    this.i18nArgs = options?.args;
  }
}
