import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { DevGuard } from './guards/dev.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { HttpExceptionFilter } from './http-exception.filter';
import { ResponseInterceptor } from './response.interceptor';

/**
 * 全局通用模块
 * 注册全局的认证守卫、响应拦截器以及异常过滤器。
 * 使用 @Global() 装饰，使这些提供者在整个应用中无需额外导入即可生效。
 */
@Global()
@Module({
  providers: [
    // 全局限流守卫 —— 对标注 @RateLimit 的路由限制请求频率
    { provide: APP_GUARD, useClass: RateLimitGuard },
    // 全局登录认证守卫 —— 拦截未登录请求
    { provide: APP_GUARD, useClass: AuthGuard },
    // 全局开发环境守卫 —— 生产环境禁用 @DevOnly 标记的接口
    { provide: APP_GUARD, useClass: DevGuard },
    // 全局响应拦截器 —— 统一包装返回格式
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // 全局 HTTP 异常过滤器 —— 统一错误响应格式
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class CommonModule {}
