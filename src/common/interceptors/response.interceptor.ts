import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../response';

/**
 * 响应拦截器
 * 统一包装所有正常返回结果为 ApiResponse 格式：{ code, message, success, remark }
 * 控制器只需返回业务数据，拦截器自动装入 remark 字段
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 字符串类型（如 SVG 验证码）直接返回，不包装
        if (typeof data === 'string') {
          return data;
        }
        // 已经是 ApiResponse 格式则直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return ApiResponse.ok(data);
      }),
    );
  }
}
