import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { UNAUTHORIZED, HttpStatus, MSG, API_PATH } from '../../constant';

/**
 * 登录认证守卫
 * 拦截所有请求，检查 Session 中是否包含有效的用户 ID。
 * 路径以 /public/ 开头的接口免登录校验。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /** @inheritdoc */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // 公开路径（如验证码、登录接口）直接放行，无需登录
    if (request.path.startsWith(API_PATH.PUBLIC_PREFIX)) {
      return true;
    }

    // Session 中不存在 userId，说明未登录
    if (!request.session?.userId) {
      throw new BusinessException(HttpStatus.UNAUTHORIZED, MSG.AUTH.LOGIN_REQUIRED, UNAUTHORIZED);
    }

    return true;
  }
}
