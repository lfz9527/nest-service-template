import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../response';
import { I18nContext } from 'nestjs-i18n';

/**
 * 响应拦截器
 * 统一包装所有正常返回结果为 ApiResponse 格式：{ code, message, success, data }
 * 控制器只需返回业务数据，拦截器自动装入 data 字段，message 通过 I18nContext 翻译。
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // 已经是 ApiResponse 格式则直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        const i18n = I18nContext.current();
        return ApiResponse.success(data, i18n?.t('common.success') ?? 'Success');
      }),
    );
  }
}
