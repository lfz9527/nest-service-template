import { SetMetadata } from '@nestjs/common';

/** 限流元数据键名 */
export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** 时间窗口，单位秒 */
  windowSeconds: number;
  /** 窗口内最大请求数 */
  max: number;
}

/**
 * 接口限流装饰器
 * 在指定时间窗口内限制请求次数，超限返回 429
 * @param options 限流配置
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
