import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { BusinessException } from '../business.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { UNAUTHORIZED, KICKED_OFF, HttpStatus, API_PATH, SESSION_MODE } from '../../constant';

/**
 * 登录认证守卫
 * 拦截所有请求，检查 Session 中是否包含有效的用户 ID。
 * 路径以 /public/ 开头或匹配 PUBLIC_EXACT 的接口免登录校验。
 * 单机模式下额外校验当前 Session 是否为最新活跃 Session，非最新则返回 402（被踢下线）。
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 公开路径（验证码、登录、健康检查等）直接放行，无需登录
    if (
      request.path.startsWith(API_PATH.PUBLIC_PREFIX) ||
      API_PATH.PUBLIC_EXACT.includes(request.path)
    ) {
      return true;
    }

    // Session 中不存在 userId，说明未登录
    if (!request.session?.userId) {
      throw new BusinessException(HttpStatus.UNAUTHORIZED, 'auth.login_required', {
        businessCode: UNAUTHORIZED,
      });
    }

    // 单机模式：校验当前 Session 是否为该用户的最新活跃 Session
    const isSingleMode = process.env.SESSION_MODE === SESSION_MODE.SINGLE;
    if (isSingleMode) {
      const record = await this.prisma.userSession.findUnique({
        where: { userId: request.session.userId },
      });
      if (!record || record.sessionId !== request.session.id) {
        throw new BusinessException(KICKED_OFF, 'auth.kicked_off', { businessCode: KICKED_OFF });
      }
    }

    return true;
  }
}
