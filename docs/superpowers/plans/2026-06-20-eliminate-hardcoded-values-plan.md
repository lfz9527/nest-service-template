# 消除硬编码实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目中散落的魔术数字、硬编码字符串、路径、配置值集中到常量/枚举文件中

**Architecture:** 在 `src/common/` 下新增 4 个纯常量文件 + 改造 1 个现有文件，然后逐模块替换引用。不新增 NestJS 模块，不改变运行时行为。

**Tech Stack:** TypeScript, NestJS HttpStatus enum, `as const` 常量对象

## Global Constraints

- 不新增 NestJS 模块
- 不新增 npm 依赖
- 不改变运行时行为（纯重构）
- 保持现有 `code.ts` 的导出向后兼容（`SUCCESS`, `FAIL` 等继续可用）
- `prisma/schema.prisma` 的 `@default(1)` 保持不变

---

### Task 1: 创建 4 个新常量文件 + 改造 code.ts

**Files:**
- Create: `src/common/messages.ts`
- Create: `src/common/paths.ts`
- Create: `src/common/permissions.ts`
- Create: `src/common/config.defaults.ts`
- Modify: `src/common/code.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `MSG`, `API_PATH`, `PERM`, `CONFIG_DEFAULTS`, `EntityStatus` enum, `HttpStatus` re-export

- [ ] **Step 1: 创建 messages.ts**

```ts
export const MSG = {
  AUTH: {
    NEED_CAPTCHA: '请先获取验证码',
    CAPTCHA_WRONG: '验证码错误',
    LOGIN_FAILED: '用户名或密码错误',
    LOGIN_REQUIRED: '请先登录',
    LOGOUT_SUCCESS: '已退出',
  },
  PERMISSION: {
    FORBIDDEN: '无权限',
  },
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: '请求过于频繁，请稍后再试',
  },
  USER: {
    NOT_FOUND: '用户不存在',
    USERNAME_EXISTS: '用户名已存在',
    MISSING_ID: '缺少用户ID',
    DELETE_SUCCESS: '删除成功',
    ASSIGN_ROLE_SUCCESS: '分配成功',
  },
  ROLE: {
    NOT_FOUND: '角色不存在',
    NAME_OR_CODE_EXISTS: '角色名或编码已存在',
    MISSING_ID: '缺少角色ID',
    ROLE_EXISTS: '角色已存在',
    DELETE_SUCCESS: '删除成功',
    ASSIGN_MENU_SUCCESS: '分配成功',
  },
  MENU: {
    NOT_FOUND: '菜单不存在',
    CODE_EXISTS: '菜单编码已存在',
    MISSING_ID: '缺少菜单ID',
    HAS_CHILDREN: '请先删除子菜单',
    DELETE_SUCCESS: '删除成功',
  },
  COMMON: {
    SUCCESS: '操作成功',
    BAD_REQUEST: '请求参数有误',
    INTERNAL_ERROR: '服务器内部错误',
    MISSING_ENV_VARS: '缺少必需的环境变量: ',
  },
} as const;
```

- [ ] **Step 2: 创建 paths.ts**

```ts
export const API_PATH = {
  AUTH: {
    CAPTCHA: '/public/auth/getCaptcha',
    LOGIN: '/public/auth/login',
    LOGOUT: '/public/auth/logout',
    USER_INFO: '/api/auth/getUserInfo',
  },
  USER: {
    LIST: '/api/user/getUserList',
    BY_ID: '/api/user/getUserById',
    ADD: '/api/user/addUser',
    UPDATE: '/api/user/updateUser',
    DELETE: '/api/user/delUser',
    ASSIGN_ROLES: '/api/user/assignRoles',
  },
  ROLE: {
    LIST: '/api/role/getRoleList',
    BY_ID: '/api/role/getRoleById',
    ADD: '/api/role/addRole',
    UPDATE: '/api/role/updateRole',
    DELETE: '/api/role/delRole',
    ASSIGN_MENUS: '/api/role/assignMenus',
  },
  MENU: {
    TREE: '/api/menu/getMenuTree',
    BY_ID: '/api/menu/getMenuById',
    ADD: '/api/menu/addMenu',
    UPDATE: '/api/menu/updateMenu',
    DELETE: '/api/menu/delMenu',
  },
  PUBLIC_PREFIX: '/public/',
} as const;
```

- [ ] **Step 3: 创建 permissions.ts**

```ts
export const PERM = {
  USER: {
    LIST: 'user:list',
    ADD: 'user:add',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
    ASSIGN_ROLE: 'user:assignRole',
  },
  ROLE: {
    LIST: 'role:list',
    ADD: 'role:add',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
    ASSIGN_MENU: 'role:assignMenu',
  },
  MENU: {
    LIST: 'menu:list',
    ADD: 'menu:add',
    UPDATE: 'menu:update',
    DELETE: 'menu:delete',
  },
} as const;
```

- [ ] **Step 4: 创建 config.defaults.ts**

```ts
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
```

- [ ] **Step 5: 改造 code.ts**

将 `src/common/code.ts` 替换为：

```ts
import { HttpStatus } from '@nestjs/common';

// 业务响应码（保持向后兼容）
/** 成功 */
export const SUCCESS = 0;
/** 失败 */
export const FAIL = -1;
/** 未登录 */
export const UNAUTHORIZED = 401;
/** 权限不足 */
export const FORBIDDEN = 403;
/** 请求过于频繁 */
export const TOO_MANY_REQUESTS = 429;

// 将 NestJS HttpStatus 枚举统一出口，供全项目使用
export { HttpStatus };

// 实体状态枚举（替代 status === 1 这类魔术数）
export enum EntityStatus {
  DISABLED = 0,
  ENABLED = 1,
}
```

- [ ] **Step 6: 编译验证**

```bash
npm run build
```

Expected: 编译通过，无类型错误

- [ ] **Step 7: 提交**

```bash
git add src/common/messages.ts src/common/paths.ts src/common/permissions.ts src/common/config.defaults.ts src/common/code.ts
git commit -m "feat: 新增常量文件集中管理硬编码值"
```

---

### Task 2: 改造 4 个守卫

**Files:**
- Modify: `src/common/guards/auth.guard.ts`
- Modify: `src/common/guards/permission.guard.ts`
- Modify: `src/common/guards/rate-limit.guard.ts`
- Modify: `src/common/guards/dev.guard.ts`

**Interfaces:**
- Consumes: `HttpStatus`, `EntityStatus` from `code.ts`, `MSG` from `messages.ts`, `API_PATH` from `paths.ts`, `CONFIG_DEFAULTS` from `config.defaults.ts`
- Produces: (same public behavior, internal refactors only)

- [ ] **Step 1: 改造 auth.guard.ts**

将 `src/common/guards/auth.guard.ts` 替换为：

```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { BusinessException } from '../exceptions/business.exception';
import { UNAUTHORIZED, HttpStatus } from '../code';
import { MSG } from '../messages';
import { API_PATH } from '../paths';

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
```

- [ ] **Step 2: 改造 permission.guard.ts**

将 `src/common/guards/permission.guard.ts` 替换为：

```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessException } from '../exceptions/business.exception';
import { FORBIDDEN, HttpStatus, EntityStatus } from '../code';
import { MSG } from '../messages';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';

/**
 * 权限校验守卫
 * 检查当前登录用户是否拥有路由所要求的菜单权限码。
 * 未标记 @Permissions() 的路由直接放行。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  /** @inheritdoc */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      throw new BusinessException(HttpStatus.FORBIDDEN, MSG.PERMISSION.FORBIDDEN, FORBIDDEN);
    }

    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                roleMenus: {
                  include: { menu: true },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRoles) {
      throw new BusinessException(HttpStatus.FORBIDDEN, MSG.PERMISSION.FORBIDDEN, FORBIDDEN);
    }

    const menuCodes = new Set<string>();
    for (const ur of userWithRoles.userRoles) {
      if (ur.role.status === EntityStatus.ENABLED) {
        for (const rm of ur.role.roleMenus) {
          if (rm.menu.status === EntityStatus.ENABLED) {
            menuCodes.add(rm.menu.code);
          }
        }
      }
    }

    if (!menuCodes.has(requiredPermission)) {
      throw new BusinessException(HttpStatus.FORBIDDEN, MSG.PERMISSION.FORBIDDEN, FORBIDDEN);
    }

    return true;
  }
}
```

- [ ] **Step 3: 改造 rate-limit.guard.ts**

将 `src/common/guards/rate-limit.guard.ts` 替换为：

```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';
import { BusinessException } from '../exceptions/business.exception';
import { TOO_MANY_REQUESTS, HttpStatus } from '../code';
import { MSG } from '../messages';
import { CONFIG_DEFAULTS } from '../config.defaults';

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
        MSG.RATE_LIMIT.TOO_MANY_REQUESTS,
        TOO_MANY_REQUESTS,
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
```

- [ ] **Step 4: 改造 dev.guard.ts**

将 `src/common/guards/dev.guard.ts` 替换为：

```ts
import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEV_ONLY_KEY } from '../decorators/dev-only.decorator';

const ENV_PRODUCTION = 'production';

@Injectable()
export class DevGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isDevOnly = this.reflector.getAllAndOverride<boolean>(DEV_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isDevOnly && process.env.NODE_ENV === ENV_PRODUCTION) {
      throw new NotFoundException();
    }

    return true;
  }
}
```

- [ ] **Step 5: 编译验证**

```bash
npm run build
```

Expected: 编译通过

- [ ] **Step 6: 提交**

```bash
git add src/common/guards/auth.guard.ts src/common/guards/permission.guard.ts src/common/guards/rate-limit.guard.ts src/common/guards/dev.guard.ts
git commit -m "refactor: 守卫层使用常量替代硬编码"
```

---

### Task 3: 改造 http-exception.filter.ts + response.ts

**Files:**
- Modify: `src/common/filters/http-exception.filter.ts`
- Modify: `src/common/response.ts`

**Interfaces:**
- Consumes: `MSG` from `messages.ts`, `HttpStatus` from `code.ts`
- Produces: (same public behavior)

- [ ] **Step 1: 改造 http-exception.filter.ts**

将 `src/common/filters/http-exception.filter.ts` 替换为：

```ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { Response } from 'express';
import { ApiResponse } from '../response';
import { FAIL } from '../code';
import { MSG } from '../messages';
import { BusinessException } from '../exceptions/business.exception';
import { PinoLogger } from 'nestjs-pino';

/** Prisma 错误码常量 */
const PRISMA_CODES = {
  UNIQUE_CONSTRAINT: 'P2002',
  RECORD_NOT_FOUND: 'P2025',
  FOREIGN_KEY_FAILED: 'P2003',
  CONSTRAINT_VIOLATION: 'P2014',
  TABLE_NOT_FOUND: 'P2021',
  COLUMN_NOT_FOUND: 'P2022',
} as const;

/**
 * 全局异常过滤器
 * - HttpException / BusinessException → 按业务状态码返回
 * - Prisma 数据库异常 → 转换为友好中文提示
 * - 其他未知异常 → 统一 500，避免泄露内部细节
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      this.handleHttpException(exception, request, response);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.handlePrismaError(exception, request, response);
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.handlePrismaValidationError(exception, request, response);
      return;
    }

    this.handleUnknownError(exception, request, response);
  }

  private handleHttpException(
    exception: HttpException,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const httpCode = exception.getStatus();
    const message = exception.message;

    this.logger.warn(
      { statusCode: httpCode, method: request.method, url: request.url },
      message,
    );

    const businessCode =
      exception instanceof BusinessException ? exception.businessCode : FAIL;
    response.status(httpCode).json({ ...ApiResponse.fail(message), code: businessCode });
  }

  private handlePrismaError(
    error: Prisma.PrismaClientKnownRequestError,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const message = this.translatePrismaError(error);

    this.logger.error(
      {
        prismaCode: error.code,
        target: error.meta?.target,
        method: request.method,
        url: request.url,
      },
      message,
    );

    response.status(HttpStatus.BAD_REQUEST).json(ApiResponse.fail(message));
  }

  private handlePrismaValidationError(
    _error: Prisma.PrismaClientValidationError,
    request: { method: string; url: string },
    response: Response,
  ): void {
    this.logger.error(
      { method: request.method, url: request.url },
      'Prisma validation error',
    );

    response
      .status(HttpStatus.BAD_REQUEST)
      .json(ApiResponse.fail(MSG.COMMON.BAD_REQUEST));
  }

  private handleUnknownError(
    error: unknown,
    request: { method: string; url: string },
    response: Response,
  ): void {
    const err =
      error instanceof Error ? error : new Error(String(error));

    this.logger.error(
      { method: request.method, url: request.url, stack: err.stack },
      err.message,
    );

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.fail(MSG.COMMON.INTERNAL_ERROR));
  }

  private translatePrismaError(error: Prisma.PrismaClientKnownRequestError): string {
    const target = (error.meta?.target as string[])?.join('、') ?? '';

    switch (error.code) {
      case PRISMA_CODES.UNIQUE_CONSTRAINT:
        return target ? `${target} 已存在，请勿重复添加` : '数据已存在，请勿重复添加';
      case PRISMA_CODES.RECORD_NOT_FOUND:
        return '目标记录不存在，可能已被删除';
      case PRISMA_CODES.FOREIGN_KEY_FAILED:
        return target ? `操作失败：${target} 存在关联数据无法删除` : '存在关联数据，无法执行此操作';
      case PRISMA_CODES.CONSTRAINT_VIOLATION:
        return '违反数据关联约束，请检查关联数据';
      case PRISMA_CODES.TABLE_NOT_FOUND:
        this.logger.error({ table: error.meta?.table }, 'Prisma: table not found');
        return MSG.COMMON.INTERNAL_ERROR;
      case PRISMA_CODES.COLUMN_NOT_FOUND:
        this.logger.error({ column: error.meta?.column }, 'Prisma: column not found');
        return MSG.COMMON.INTERNAL_ERROR;
      default:
        return `数据库操作异常 (${error.code})`;
    }
  }
}
```

- [ ] **Step 2: 改造 response.ts**

将 `src/common/response.ts` 替换为：

```ts
import { SUCCESS, FAIL } from './code';
import { MSG } from './messages';

/**
 * 统一响应结构
 * code    — 业务层状态码（0=成功，-1=失败）
 * data    — 业务数据，成功时存放返回数据
 */
export class ApiResponse<T = unknown> {
  code: number;
  message: string;
  success: boolean;
  data: T | null;

  static success<T>(data: T, message = MSG.COMMON.SUCCESS): ApiResponse<T> {
    return { code: SUCCESS, message, success: true, data };
  }

  static fail(message: string): ApiResponse<null> {
    return { code: FAIL, message, success: false, data: null };
  }
}

/** 分页列表数据结构 */
export class ListResult<T = unknown> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;

  constructor(list: T[], total: number, page: number, pageSize: number) {
    this.list = list;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
  }
}
```

- [ ] **Step 3: 编译验证**

```bash
npm run build
```

Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src/common/filters/http-exception.filter.ts src/common/response.ts
git commit -m "refactor: 异常过滤器和响应类使用常量替代硬编码"
```

---

### Task 4: 改造 auth 模块

**Files:**
- Modify: `src/auth/auth.controller.ts`
- Modify: `src/auth/auth.service.ts`

**Interfaces:**
- Consumes: `HttpStatus`, `EntityStatus` from `code.ts`, `MSG` from `messages.ts`, `API_PATH` from `paths.ts`, `CONFIG_DEFAULTS` from `config.defaults.ts`
- Produces: (same public behavior)

- [ ] **Step 1: 改造 auth.controller.ts**

将 `src/auth/auth.controller.ts` 替换为：

```ts
import { Controller, Get, Post, Body, Session, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AppSession } from '../common/types';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { API_PATH } from '../common/paths';
import { MSG } from '../common/messages';
import { CONFIG_DEFAULTS } from '../common/config.defaults';

/**
 * 认证控制器
 * 处理登录、登出、验证码获取和用户信息查询等认证相关的 HTTP 请求
 */
@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  /** GET /public/auth/getCaptcha */
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_MAX,
  })
  @Get(API_PATH.AUTH.CAPTCHA)
  getCaptcha(@Session() session: AppSession) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  /** POST /public/auth/login */
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_MAX,
  })
  @Post(API_PATH.AUTH.LOGIN)
  login(@Body() dto: LoginDto, @Session() session: AppSession) {
    return this.authService.login(dto, session);
  }

  /** POST /public/auth/logout */
  @Post(API_PATH.AUTH.LOGOUT)
  logout(@Session() session: AppSession) {
    this.authService.logout(session);
    return { message: MSG.AUTH.LOGOUT_SUCCESS };
  }

  /** GET /api/auth/getUserInfo */
  @Get(API_PATH.AUTH.USER_INFO)
  async getUserInfo(@Req() req: Request) {
    const session = req.session as AppSession;
    return this.authService.getUserInfo(session.userId!);
  }
}
```

- [ ] **Step 2: 改造 auth.service.ts**

将 `src/auth/auth.service.ts` 替换为：

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as svgCaptcha from 'svg-captcha';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { AppSession, MenuTreeNode } from '../common/types';
import { BusinessException } from '../common/exceptions/business.exception';
import { HttpStatus, EntityStatus } from '../common/code';
import { MSG } from '../common/messages';
import { CONFIG_DEFAULTS } from '../common/config.defaults';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  generateCaptcha(session: AppSession): string {
    const captcha = svgCaptcha.create({
      size: CONFIG_DEFAULTS.CAPTCHA.SIZE,
      noise: CONFIG_DEFAULTS.CAPTCHA.NOISE,
      color: true,
    });
    session.captcha = captcha.text.toLowerCase();
    return captcha.data;
  }

  async login(dto: LoginDto, session: AppSession): Promise<{ userId: number; username: string }> {
    if (!session.captcha) {
      this.logger.warn('Login failed: captcha not initialized');
      throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.AUTH.NEED_CAPTCHA);
    }
    if (dto.captcha.toLowerCase() !== session.captcha) {
      this.logger.warn({ username: dto.username }, 'Login failed: wrong captcha');
      throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.AUTH.CAPTCHA_WRONG);
    }
    delete session.captcha;

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || user.status !== EntityStatus.ENABLED) {
      this.logger.warn({ username: dto.username }, 'Login failed: user not found or disabled');
      throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.AUTH.LOGIN_FAILED);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn({ username: dto.username }, 'Login failed: wrong password');
      throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.AUTH.LOGIN_FAILED);
    }

    session.userId = user.id;
    this.logger.info({ userId: user.id, username: user.username }, 'Login success');
    return { userId: user.id, username: user.username };
  }

  logout(session: AppSession): void {
    const userId = session.userId;
    session.destroy((err) => {
      if (err) {
        this.logger.error({ userId, err }, 'Session destroy failed');
      }
    });
    this.logger.info({ userId }, 'Logout');
  }

  async getUserInfo(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                roleMenus: {
                  include: { menu: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const menuMap = new Map<number, MenuTreeNode>();
    for (const ur of user.userRoles) {
      if (ur.role.status !== EntityStatus.ENABLED) continue;
      for (const rm of ur.role.roleMenus) {
        if (rm.menu.status !== EntityStatus.ENABLED) continue;
        if (!menuMap.has(rm.menu.id)) {
          menuMap.set(rm.menu.id, {
            id: rm.menu.id,
            name: rm.menu.name,
            code: rm.menu.code,
            parentId: rm.menu.parentId,
            path: rm.menu.path,
            icon: rm.menu.icon,
            sortOrder: rm.menu.sortOrder,
            children: [],
          });
        }
      }
    }

    const menus = this.buildMenuTree(Array.from(menuMap.values()));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      menus,
    };
  }

  private buildMenuTree(menus: MenuTreeNode[]): MenuTreeNode[] {
    const map = new Map<number, MenuTreeNode>();
    const roots: MenuTreeNode[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId)!.children!.push(menu);
      } else {
        roots.push(menu);
      }
    }

    roots.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const root of roots) {
      this.sortChildren(root);
    }

    return roots;
  }

  private sortChildren(node: MenuTreeNode): void {
    node.children!.sort((a: MenuTreeNode, b: MenuTreeNode) => a.sortOrder - b.sortOrder);
    for (const child of node.children!) {
      this.sortChildren(child);
    }
  }
}
```

- [ ] **Step 3: 编译验证**

```bash
npm run build
```

Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src/auth/auth.controller.ts src/auth/auth.service.ts
git commit -m "refactor: auth模块使用常量替代硬编码"
```

---

### Task 5: 改造 user 模块

**Files:**
- Modify: `src/user/user.controller.ts`
- Modify: `src/user/user.service.ts`

**Interfaces:**
- Consumes: `HttpStatus` from `code.ts`, `MSG` from `messages.ts`, `API_PATH` from `paths.ts`, `PERM` from `permissions.ts`, `CONFIG_DEFAULTS` from `config.defaults.ts`
- Produces: (same public behavior)

- [ ] **Step 1: 改造 user.controller.ts**

将 `src/user/user.controller.ts` 替换为：

```ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH } from '../common/paths';
import { PERM } from '../common/permissions';
import { CONFIG_DEFAULTS } from '../common/config.defaults';

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.LIST)
  getUserList(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.userService.getUserList(
      Number(page) || CONFIG_DEFAULTS.DEFAULT_PAGE,
      Number(pageSize) || CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
    );
  }

  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.BY_ID)
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @Permissions(PERM.USER.ADD)
  @Post(API_PATH.USER.ADD)
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  @Permissions(PERM.USER.UPDATE)
  @Post(API_PATH.USER.UPDATE)
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  @Permissions(PERM.USER.DELETE)
  @Post(API_PATH.USER.DELETE)
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  @Permissions(PERM.USER.ASSIGN_ROLE)
  @Post(API_PATH.USER.ASSIGN_ROLES)
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
```

- [ ] **Step 2: 改造 user.service.ts**

将 `src/user/user.service.ts` 替换为：

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcryptjs';
import { BusinessException } from '../common/exceptions/business.exception';
import { HttpStatus } from '../common/code';
import { MSG } from '../common/messages';
import { CONFIG_DEFAULTS } from '../common/config.defaults';
import { ListResult } from '../common/response';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UserService.name);
  }

  async getUserList(
    page: number = CONFIG_DEFAULTS.DEFAULT_PAGE,
    pageSize: number = CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
  ) {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return new ListResult(list, total, page, pageSize);
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: { role: true },
        },
      },
    });
    if (!user) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.USER.NOT_FOUND);
    }
    return user;
  }

  async addUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.USER.USERNAME_EXISTS);
    }
    const passwordHash = await bcrypt.hash(dto.password, CONFIG_DEFAULTS.BCRYPT_SALT_ROUNDS);
    const newUser = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        email: dto.email,
        phone: dto.phone,
      },
      select: { id: true, username: true, email: true, phone: true },
    });
    this.logger.info({ userId: newUser.id, username: newUser.username }, 'User created');
    return newUser;
  }

  async updateUser(dto: UpdateUserDto & { id?: number }) {
    const { id, password, ...rest } = dto;
    if (!id) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.USER.MISSING_ID);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.USER.NOT_FOUND);

    if (rest.username && rest.username !== user.username) {
      const existing = await this.prisma.user.findUnique({ where: { username: rest.username } });
      if (existing) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.USER.USERNAME_EXISTS);
    }

    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, CONFIG_DEFAULTS.BCRYPT_SALT_ROUNDS);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, phone: true, status: true },
    });
    this.logger.info({ userId: id }, 'User updated');
    return updated;
  }

  async delUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.USER.NOT_FOUND);
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
    this.logger.info({ userId: id }, 'User deleted');
    return { message: MSG.USER.DELETE_SUCCESS };
  }

  async assignRoles(userId: number, dto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.USER.NOT_FOUND);

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId, roleId })),
        });
      }
    });
    this.logger.info({ userId, roleIds: dto.roleIds }, 'Roles assigned');
    return { message: MSG.USER.ASSIGN_ROLE_SUCCESS };
  }
}
```

- [ ] **Step 3: 编译验证**

```bash
npm run build
```

Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src/user/user.controller.ts src/user/user.service.ts
git commit -m "refactor: user模块使用常量替代硬编码"
```

---

### Task 6: 改造 role 模块

**Files:**
- Modify: `src/role/role.controller.ts`
- Modify: `src/role/role.service.ts`

**Interfaces:**
- Consumes: `HttpStatus` from `code.ts`, `MSG` from `messages.ts`, `API_PATH` from `paths.ts`, `PERM` from `permissions.ts`
- Produces: (same public behavior)

- [ ] **Step 1: 改造 role.controller.ts**

将 `src/role/role.controller.ts` 替换为：

```ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH } from '../common/paths';
import { PERM } from '../common/permissions';

@Controller()
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.LIST)
  getRoleList() {
    return this.roleService.getRoleList();
  }

  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.BY_ID)
  getRoleById(@Query('id') id: string) {
    return this.roleService.getRoleById(Number(id));
  }

  @Permissions(PERM.ROLE.ADD)
  @Post(API_PATH.ROLE.ADD)
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  @Permissions(PERM.ROLE.UPDATE)
  @Post(API_PATH.ROLE.UPDATE)
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  @Permissions(PERM.ROLE.DELETE)
  @Post(API_PATH.ROLE.DELETE)
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  @Permissions(PERM.ROLE.ASSIGN_MENU)
  @Post(API_PATH.ROLE.ASSIGN_MENUS)
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
```

- [ ] **Step 2: 改造 role.service.ts**

将 `src/role/role.service.ts` 替换为：

```ts
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import { HttpStatus } from '../common/code';
import { MSG } from '../common/messages';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RoleService.name);
  }

  async getRoleList() {
    return this.prisma.role.findMany({
      include: {
        roleMenus: { include: { menu: true } },
        _count: { select: { userRoles: true } },
      },
    });
  }

  async getRoleById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        roleMenus: { include: { menu: true } },
        _count: { select: { userRoles: true } },
      },
    });
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.ROLE.NOT_FOUND);
    return role;
  }

  async addRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.ROLE.NAME_OR_CODE_EXISTS);
    const newRole = await this.prisma.role.create({ data: dto });
    this.logger.info({ roleId: newRole.id, name: newRole.name }, 'Role created');
    return newRole;
  }

  async updateRole(dto: UpdateRoleDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.ROLE.MISSING_ID);

    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.ROLE.NOT_FOUND);

    const conflicts: string[] = [];
    if (data.name && data.name !== role.name) {
      const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
      if (existing) conflicts.push('角色名');
    }
    if (data.code && data.code !== role.code) {
      const existing = await this.prisma.role.findUnique({ where: { code: data.code } });
      if (existing) conflicts.push('角色编码');
    }
    if (conflicts.length > 0) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, `${conflicts.join('、')}已存在`);
    }

    const updated = await this.prisma.role.update({ where: { id }, data });
    this.logger.info({ roleId: id }, 'Role updated');
    return updated;
  }

  async delRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.ROLE.NOT_FOUND);
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
    this.logger.info({ roleId: id }, 'Role deleted');
    return { message: MSG.ROLE.DELETE_SUCCESS };
  }

  async assignMenus(roleId: number, dto: AssignMenusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.ROLE.NOT_FOUND);
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (dto.menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: dto.menuIds.map((menuId) => ({ roleId, menuId })),
        });
      }
    });
    this.logger.info({ roleId, menuIds: dto.menuIds }, 'Menus assigned to role');
    return { message: MSG.ROLE.ASSIGN_MENU_SUCCESS };
  }
}
```

- [ ] **Step 3: 编译验证**

```bash
npm run build
```

Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src/role/role.controller.ts src/role/role.service.ts
git commit -m "refactor: role模块使用常量替代硬编码"
```

---

### Task 7: 改造 menu 模块

**Files:**
- Modify: `src/menu/menu.controller.ts`
- Modify: `src/menu/menu.service.ts`

**Interfaces:**
- Consumes: `HttpStatus` from `code.ts`, `MSG` from `messages.ts`, `API_PATH` from `paths.ts`, `PERM` from `permissions.ts`
- Produces: (same public behavior)

- [ ] **Step 1: 改造 menu.controller.ts**

将 `src/menu/menu.controller.ts` 替换为：

```ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH } from '../common/paths';
import { PERM } from '../common/permissions';

@Controller()
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.TREE)
  getMenuTree() {
    return this.menuService.getMenuTree();
  }

  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.BY_ID)
  getMenuById(@Query('id') id: string) {
    return this.menuService.getMenuById(Number(id));
  }

  @Permissions(PERM.MENU.ADD)
  @Post(API_PATH.MENU.ADD)
  addMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.addMenu(dto);
  }

  @Permissions(PERM.MENU.UPDATE)
  @Post(API_PATH.MENU.UPDATE)
  updateMenu(@Body() dto: UpdateMenuDto & { id: number }) {
    return this.menuService.updateMenu(dto);
  }

  @Permissions(PERM.MENU.DELETE)
  @Post(API_PATH.MENU.DELETE)
  delMenu(@Body('id') id: number) {
    return this.menuService.delMenu(Number(id));
  }
}
```

- [ ] **Step 2: 改造 menu.service.ts**

将 `src/menu/menu.service.ts` 替换为：

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import { HttpStatus } from '../common/code';
import { MSG } from '../common/messages';
import { MenuTreeNode } from '../common/types';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MenuService.name);
  }

  async getMenuTree() {
    const menus = await this.prisma.menu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  async getMenuById(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.MENU.NOT_FOUND);
    return menu;
  }

  async addMenu(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.MENU.CODE_EXISTS);
    const newMenu = await this.prisma.menu.create({ data: dto });
    this.logger.info({ menuId: newMenu.id, code: newMenu.code }, 'Menu created');
    return newMenu;
  }

  async updateMenu(dto: UpdateMenuDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.MENU.MISSING_ID);

    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.MENU.NOT_FOUND);

    if (data.code && data.code !== menu.code) {
      const existing = await this.prisma.menu.findUnique({ where: { code: data.code } });
      if (existing) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.MENU.CODE_EXISTS);
    }

    const updated = await this.prisma.menu.update({ where: { id }, data });
    this.logger.info({ menuId: id }, 'Menu updated');
    return updated;
  }

  async delMenu(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!menu) throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.MENU.NOT_FOUND);
    if (menu.children.length > 0) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.MENU.HAS_CHILDREN);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { menuId: id } });
      await tx.menu.delete({ where: { id } });
    });
    this.logger.info({ menuId: id }, 'Menu deleted');
    return { message: MSG.MENU.DELETE_SUCCESS };
  }

  private buildTree(menus: MenuTreeNode[]): MenuTreeNode[] {
    const map = new Map<number, MenuTreeNode>();
    const roots: MenuTreeNode[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId)!.children!.push(menu);
      } else {
        roots.push(menu);
      }
    }

    const sort = (nodes: MenuTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          sort(node.children);
        }
      }
    };
    sort(roots);

    return roots;
  }
}
```

- [ ] **Step 3: 编译验证**

```bash
npm run build
```

Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src/menu/menu.controller.ts src/menu/menu.service.ts
git commit -m "refactor: menu模块使用常量替代硬编码"
```

---

### Task 8: 最终验证

- [ ] **Step 1: 完整构建**

```bash
npm run build
```

Expected: 无错误

- [ ] **Step 2: Lint 检查**

```bash
npm run lint
```

Expected: 无新增 lint 错误

- [ ] **Step 3: 提交（如有 lint 修复）**

```bash
git add -A
git commit -m "chore: lint修复"
```

---

## 验证清单

完成后确认：
- [ ] `npm run build` 通过
- [ ] `npm run lint` 通过
- [ ] 所有 `BusinessException(400, ...)` 改为 `BusinessException(HttpStatus.BAD_REQUEST, ...)`
- [ ] 所有 `BusinessException(401, ...)` 改为 `BusinessException(HttpStatus.UNAUTHORIZED, ...)`
- [ ] 所有 `BusinessException(403, ...)` 改为 `BusinessException(HttpStatus.FORBIDDEN, ...)`
- [ ] 所有 `BusinessException(429, ...)` 改为 `BusinessException(HttpStatus.TOO_MANY_REQUESTS, ...)`
- [ ] 所有 `status === 1` / `status !== 1` 改为 `EntityStatus.ENABLED`
- [ ] 所有路由路径使用 `API_PATH.*`
- [ ] 所有权限码使用 `PERM.*`
- [ ] 所有中文消息使用 `MSG.*`
