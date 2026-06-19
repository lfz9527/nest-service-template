export const CONFIG_DEFAULTS = {
  /** bcrypt 加密盐轮数 */
  BCRYPT_SALT_ROUNDS: 10,
  /** 默认页码 */
  DEFAULT_PAGE: 1,
  /** 默认每页条数 */
  DEFAULT_PAGE_SIZE: 10,
  /** 密码最小长度 */
  PASSWORD_MIN_LENGTH: 6,
  /** MySQL 默认端口 */
  DB_DEFAULT_PORT: 3306,
  /** Session sameSite 属性 */
  SESSION_SAME_SITE: 'lax' as const,
  /** 验证码配置 */
  CAPTCHA: {
    SIZE: 4,
    NOISE: 2,
  },
  /** 限流配置 */
  RATE_LIMIT: {
    CAPTCHA_WINDOW_SECONDS: 60,
    CAPTCHA_MAX: 10,
    LOGIN_WINDOW_SECONDS: 60,
    LOGIN_MAX: 5,
    CLEANUP_INTERVAL_MS: 60_000,
  },
} as const;
