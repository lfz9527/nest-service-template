import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { UNAUTHORIZED } from '../code';

/**
 * 登录认证守卫
 * 拦截所有请求，检查 Session 中是否包含有效的用户 ID。
 * 路径以 /public/ 开头的接口免登录校验。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /**
   * 判定当前请求是否允许通过
   * @param context 执行上下文，可从中获取请求对象
   * @returns true 表示放行，false 或抛出异常表示拦截
   * @throws UnauthorizedException 用户未登录时抛出
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 公开路径（如验证码、登录接口）直接放行，无需登录
    if (request.path.startsWith('/public/')) {
      return true;
    }

    // Session 中不存在 userId，说明未登录
    if (!request.session?.userId) {
      throw new BusinessException(401, '请先登录', UNAUTHORIZED);
    }

    return true;
  }
}
