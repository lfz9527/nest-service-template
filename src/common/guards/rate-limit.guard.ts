import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { TOO_MANY_REQUESTS, HttpStatus, CONFIG_DEFAULTS } from '../../constant';

interface HitRecord {
  count: number;
  resetAt: number;
}

/**
 * 限流守卫
 * 基于内存的滑动窗口限流，配合 @RateLimit() 装饰器使用。
 * 注意：仅适用于单进程，多实例部署请改用 Redis 实现。
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly store = new Map<string, HitRecord>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private reflector: Reflector) {
    this.startCleanup();
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const key = `${request.ip}:${request.path}`;
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + options.windowSeconds * 1000 });
      return true;
    }

    record.count++;
    if (record.count > options.max) {
      throw new BusinessException(
        HttpStatus.TOO_MANY_REQUESTS,
        'rate_limit.too_many_requests',
        { businessCode: TOO_MANY_REQUESTS },
      );
    }

    return true;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store) {
        if (now > record.resetAt) {
          this.store.delete(key);
        }
      }
    }, CONFIG_DEFAULTS.RATE_LIMIT.CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
