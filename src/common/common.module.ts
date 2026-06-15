import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { HttpExceptionFilter } from './filters/http-exception.filter';

/**
 * 全局通用模块
 * 注册全局的认证守卫、权限守卫以及异常过滤器。
 * 使用 @Global() 装饰，使这些提供者在整个应用中无需额外导入即可生效。
 */
@Global()
@Module({
  providers: [
    // 全局登录认证守卫 —— 拦截未登录请求
    { provide: APP_GUARD, useClass: AuthGuard },
    // 全局权限校验守卫 —— 检查接口权限码
    { provide: APP_GUARD, useClass: PermissionGuard },
    // 全局 HTTP 异常过滤器 —— 统一错误响应格式
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class CommonModule {}
