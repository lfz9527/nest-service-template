# Logging System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured logging (nestjs-pino) covering HTTP, business operations, and Prisma queries, with console + rotating file output.

**Architecture:** New global `LoggerModule` wrapping `nestjs-pino`'s `LoggerModule.forRootAsync`, reading `.env` config via `ConfigService`. All existing services inject `PinoLogger` for business-level logging. PrismaService bridges Prisma events to PinoLogger.

**Tech Stack:** NestJS 11, nestjs-pino v4, pino-http, pino-pretty, pino-roll, Prisma 7

---

### Task 1: Install dependencies

**Files:** None (package.json updated by npm)

- [ ] **Step 1: Install nestjs-pino and pino packages**

```bash
cd /d/dashboard-service && npm install nestjs-pino pino-http pino-pretty pino-roll
```

Expected: packages installed, package.json and package-lock.json updated.

- [ ] **Step 2: Verify install**

```bash
cd /d/dashboard-service && node -e "require('nestjs-pino'); require('pino-http'); require('pino-pretty'); require('pino-roll'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add package.json package-lock.json && git commit -m "chore: install nestjs-pino, pino-http, pino-pretty, pino-roll"
```

---

### Task 2: Add logging configuration to .env files

**Files:**
- Modify: `.env.development`
- Modify: `.env.production`

- [ ] **Step 1: Append logging config to .env.development**

Append to `.env.development`:

```env
# ===========================================
# 日志配置（开发环境）
# ===========================================

# 日志级别：trace | debug | info | warn | error | fatal
LOG_LEVEL=debug

# 日志文件路径（仅生产使用，开发仅输出到控制台）
LOG_FILE_PATH=./logs/app.log

# 是否启用 pretty 格式（开发=true 生产=false）
LOG_PRETTY=true

# 日志保留天数
LOG_RETENTION_DAYS=7

# 单文件最大大小
LOG_MAX_FILE_SIZE=10m
```

- [ ] **Step 2: Append logging config to .env.production**

Append to `.env.production`:

```env
# ===========================================
# 日志配置（生产环境）
# ===========================================

# 日志级别：trace | debug | info | warn | error | fatal
LOG_LEVEL=info

# 日志文件路径
LOG_FILE_PATH=./logs/app.log

# 是否启用 pretty 格式（开发=true 生产=false）
LOG_PRETTY=false

# 日志保留天数
LOG_RETENTION_DAYS=7

# 单文件最大大小
LOG_MAX_FILE_SIZE=10m
```

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add .env.development .env.production && git commit -m "feat: add logging environment variables"
```

---

### Task 3: Create LoggerModule

**Files:**
- Create: `src/logger/logger.module.ts`

- [ ] **Step 1: Write logger.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule, PinoLogger } from 'nestjs-pino';

/**
 * 全局日志模块
 * 封装 nestjs-pino，根据环境变量动态配置 pino transports：
 * - 开发环境：pino-pretty 彩色控制台输出
 * - 生产环境：JSON 控制台 + pino-roll 文件轮转
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const level = config.get<string>('LOG_LEVEL', 'info');
        const pretty = config.get<string>('LOG_PRETTY', 'false') === 'true';
        const filePath = config.get<string>('LOG_FILE_PATH', './logs/app.log');
        const retentionDays = Number(config.get<string>('LOG_RETENTION_DAYS', '7'));
        const maxFileSize = config.get<string>('LOG_MAX_FILE_SIZE', '10m');

        if (pretty) {
          return {
            pinoHttp: {
              level,
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                },
              },
            },
          };
        }

        return {
          pinoHttp: {
            level,
            transport: {
              targets: [
                {
                  target: 'pino/file',
                  level,
                  options: { destination: 1 },
                },
                {
                  target: 'pino-roll',
                  level,
                  options: {
                    file: filePath,
                    frequency: 'daily',
                    size: maxFileSize,
                    limit: retentionDays,
                  },
                },
              ],
            },
          },
        };
      },
    }),
  ],
  exports: [PinoLogger],
})
export class LoggerModule {}
```

- [ ] **Step 2: Commit**

```bash
cd /d/dashboard-service && git add src/logger/logger.module.ts && git commit -m "feat: add global LoggerModule with env-based pino transports"
```

---

### Task 4: Wire LoggerModule into AppModule

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Import LoggerModule in AppModule**

Replace the contents of `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { MenuModule } from './menu/menu.module';
import { LoggerModule } from './logger/logger.module';

/**
 * 应用根模块
 * 集中导入所有功能模块，并注册全局控制器。
 */
@Module({
  imports: [
    // 全局环境变量配置模块，使 .env 配置在整个应用中可用
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    // 全局日志模块（基于 pino，从 ConfigService 读取日志配置）
    LoggerModule,
    // 数据库访问层模块（Prisma ORM）
    PrismaModule,
    // 全局通用模块（认证守卫、权限守卫、异常过滤器）
    CommonModule,
    // 认证模块（登录、验证码等）
    AuthModule,
    // 用户管理模块
    UserModule,
    // 角色管理模块
    RoleModule,
    // 菜单/权限资源模块
    MenuModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add src/app.module.ts && git commit -m "feat: wire LoggerModule into AppModule"
```

---

### Task 5: Add Prisma log event bridge

**Files:**
- Modify: `src/prisma/prisma.service.ts`

- [ ] **Step 1: Inject PinoLogger and add Prisma event bridging**

Replace the contents of `src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PinoLogger } from 'nestjs-pino';

/**
 * Prisma 数据库服务
 * 封装 PrismaClient，在模块初始化时自动连接数据库，
 * 在模块销毁时自动断开连接，简化生命周期管理。
 * 同时将 Prisma 内部日志事件桥接到 PinoLogger。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: PinoLogger) {
    super({
      adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
        ...(process.env.NODE_ENV === 'development'
          ? [{ level: 'query' as const, emit: 'event' as const }]
          : []),
      ],
    });
    this.logger.setContext(PrismaService.name);
  }

  async onModuleInit() {
    this.$on('error', (event: any) => {
      this.logger.error({ message: event.message, target: event.target }, 'Prisma error');
    });
    this.$on('warn', (event: any) => {
      this.logger.warn({ message: event.message, target: event.target }, 'Prisma warning');
    });
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as any, (event: any) => {
        this.logger.debug({ query: event.query, duration: event.duration }, 'Prisma query');
      });
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds without type errors.

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add src/prisma/prisma.service.ts && git commit -m "feat: bridge Prisma log events to PinoLogger"
```

---

### Task 6: Add error logging to HttpExceptionFilter

**Files:**
- Modify: `src/common/filters/http-exception.filter.ts`

- [ ] **Step 1: Inject PinoLogger into HttpExceptionFilter**

Replace the contents of `src/common/filters/http-exception.filter.ts`:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../response';
import { PinoLogger } from 'nestjs-pino';

/**
 * HTTP 异常过滤器
 * 异常统一返回 { code: -1, message, success: false, remark: null }
 * 同时通过 PinoLogger 记录错误日志
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse<Response>();
    const httpCode = exception.getStatus();
    const message = exception.message;

    this.logger.warn(
      {
        statusCode: httpCode,
        method: request.method,
        url: request.url,
      },
      message,
    );

    response.status(httpCode).json(ApiResponse.fail(message));
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add src/common/filters/http-exception.filter.ts && git commit -m "feat: add error logging to HttpExceptionFilter"
```

---

### Task 7: Add business logging to AuthService

**Files:**
- Modify: `src/auth/auth.service.ts`

- [ ] **Step 1: Inject PinoLogger and add log points**

Replace the contents of `src/auth/auth.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as svgCaptcha from 'svg-captcha';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { AppSession } from '../common/types';
import { BusinessException } from '../common/exceptions/business.exception';
import { PinoLogger } from 'nestjs-pino';

/**
 * 认证服务
 * 负责验证码生成、用户登录/登出、用户信息获取等认证相关功能
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  /**
   * 生成 SVG 格式的图形验证码
   * 将验证码文本（小写）存入 session，返回 SVG 字符串给前端渲染
   * @param session - 当前请求的 session 对象
   * @returns SVG 格式的验证码图片字符串
   */
  generateCaptcha(session: AppSession): string {
    // 创建图形验证码：4 位字符、2 条干扰线、彩色
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
    });
    // 将验证码文本转为小写后存入 session，供后续登录校验使用
    session.captcha = captcha.text.toLowerCase();
    return captcha.data;
  }

  /**
   * 用户登录
   * 先校验验证码，再校验用户名和密码，全部通过后将 userId 写入 session
   * @param dto - 登录请求数据（用户名、密码、验证码）
   * @param session - 当前请求的 session 对象
   * @returns 登录成功的用户信息（userId 和 username）
   * @throws BadRequestException 验证码未获取/错误，或用户名密码错误
   */
  async login(dto: LoginDto, session: AppSession): Promise<{ userId: number; username: string }> {
    // 检查 session 中是否存在验证码，不存在则说明未请求验证码
    if (!session.captcha) {
      this.logger.warn('Login failed: captcha not initialized');
      throw new BusinessException(400, '请先获取验证码');
    }
    // 比对用户输入的验证码（忽略大小写）
    if (dto.captcha.toLowerCase() !== session.captcha) {
      this.logger.warn({ username: dto.username }, 'Login failed: wrong captcha');
      throw new BusinessException(400, '验证码错误');
    }
    // 验证码使用后立即清除，防止重复使用
    delete session.captcha;

    // 根据用户名查询用户
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    // 用户不存在或状态非启用（status !== 1）时返回模糊的错误信息，避免信息泄露
    if (!user || user.status !== 1) {
      this.logger.warn({ username: dto.username }, 'Login failed: user not found or disabled');
      throw new BusinessException(400, '用户名或密码错误');
    }

    // 使用 bcrypt 比对明文密码与数据库中的哈希值
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn({ username: dto.username }, 'Login failed: wrong password');
      throw new BusinessException(400, '用户名或密码错误');
    }

    // 登录成功后将用户 ID 写入 session
    session.userId = user.id;
    this.logger.info({ userId: user.id, username: user.username }, 'Login success');
    return { userId: user.id, username: user.username };
  }

  /**
   * 用户登出
   * 销毁当前 session，清除所有 session 数据
   * @param session - 当前请求的 session 对象
   */
  logout(session: AppSession): void {
    const userId = session.userId;
    session.destroy(() => {});
    this.logger.info({ userId }, 'Logout');
  }

  /**
   * 获取当前登录用户的详细信息及其权限菜单
   * 通过用户-角色-菜单的关联关系，收集所有启用的菜单并构建为树形结构
   * @param userId - 用户 ID
   * @returns 用户信息及树形菜单数组，用户不存在时返回 null
   */
  async getUserInfo(userId: number) {
    // 查询用户及其关联的角色和菜单（嵌套加载 role -> roleMenus -> menu）
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

    // 使用 Map 对来自多个角色的菜单进行去重合并
    const menuMap = new Map<number, any>();
    for (const ur of user.userRoles) {
      // 跳过已禁用的角色
      if (ur.role.status !== 1) continue;
      for (const rm of ur.role.roleMenus) {
        // 跳过已禁用的菜单
        if (rm.menu.status !== 1) continue;
        // 以菜单 ID 为键，首个遇到的菜单保留，后续重复的跳过
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

    // 将去重后的平铺菜单列表构建为树形结构
    const menus = this.buildMenuTree(Array.from(menuMap.values()));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      menus,
    };
  }

  /**
   * 构建菜单树
   * 将平铺的菜单列表按 parentId 组装为多级树形结构，并按 sortOrder 排序
   * @param menus - 平铺的菜单数组
   * @returns 排序后的菜单树（仅包含根节点）
   */
  private buildMenuTree(menus: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    // 将所有菜单放入 Map，并为每个菜单初始化 children 数组
    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    // 遍历 Map，将每个菜单挂到其父节点的 children 中；
    // 无 parentId 或父节点不在当前集合中时视为根节点
    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId).children.push(menu);
      } else {
        roots.push(menu);
      }
    }

    // 根节点按 sortOrder 升序排列
    roots.sort((a, b) => a.sortOrder - b.sortOrder);
    // 递归对每个子树内部也进行排序
    for (const root of roots) {
      this.sortChildren(root);
    }

    return roots;
  }

  /**
   * 递归排序子菜单
   * 按 sortOrder 对当前节点的所有子节点排序，并逐级向下递归
   * @param node - 当前菜单节点
   */
  private sortChildren(node: any): void {
    node.children.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    for (const child of node.children) {
      this.sortChildren(child);
    }
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add src/auth/auth.service.ts && git commit -m "feat: add business logging to AuthService"
```

---

### Task 8: Add business logging to UserService

**Files:**
- Modify: `src/user/user.service.ts`

- [ ] **Step 1: Inject PinoLogger and add log points**

Replace the contents of `src/user/user.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcryptjs';
import { BusinessException } from '../common/exceptions/business.exception';
import { PinoLogger } from 'nestjs-pino';

/**
 * 用户管理服务
 * 提供用户的增删改查、分页查询、角色分配等业务逻辑
 */
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UserService.name);
  }

  /**
   * 分页查询用户列表
   * 排除 passwordHash 敏感字段，仅返回基础信息
   * @param page - 页码，默认 1
   * @param pageSize - 每页条数，默认 10
   * @returns 包含列表、总数、页码和每页条数的分页结果
   */
  async getUserList(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    // 并发执行数据查询和总数统计，减少等待时间
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        // 显式 select 避免返回 passwordHash 等敏感字段
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
    return { list, total, page, pageSize };
  }

  /**
   * 根据 ID 获取单个用户详情
   * 同时加载该用户关联的角色信息
   * @param id - 用户 ID
   * @throws BadRequestException 用户不存在时抛出
   * @returns 用户详情及关联角色
   */
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
        // 同时加载用户关联的角色（包含角色详情）
        userRoles: {
          include: { role: true },
        },
      },
    });
    if (!user) {
      throw new BusinessException(400, '用户不存在');
    }
    return user;
  }

  /**
   * 新增用户
   * 先检查用户名是否已存在，再对密码进行 bcrypt 哈希后入库
   * @param dto - 创建用户请求数据
   * @throws BadRequestException 用户名已存在时抛出
   * @returns 新建用户的基础信息（不含密码）
   */
  async addUser(dto: CreateUserDto) {
    // 校验用户名唯一性
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new BusinessException(400, '用户名已存在');
    }
    // 使用 bcrypt 对明文密码进行哈希（10 轮盐值迭代）
    const passwordHash = await bcrypt.hash(dto.password, 10);
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

  /**
   * 更新用户信息
   * 仅更新提供的字段；若 password 非空则一并重哈希密码
   * @param dto - 更新用户请求数据（可附带 id）
   * @throws BadRequestException 缺少 id 时抛出
   * @returns 更新后的用户基础信息
   */
  async updateUser(dto: UpdateUserDto & { id?: number }) {
    const { id, password, ...rest } = dto;
    if (!id) throw new BusinessException(400, '缺少用户ID');

    const data: any = { ...rest };
    // 如果有新密码，对其做 bcrypt 哈希后再更新
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, phone: true, status: true },
    });
    this.logger.info({ userId: id }, 'User updated');
    return updated;
  }

  /**
   * 删除用户
   * 先检查用户是否存在，然后级联删除关联的角色记录，最后删除用户本身
   * @param id - 用户 ID
   * @throws BadRequestException 用户不存在时抛出
   */
  async delUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BusinessException(400, '用户不存在');
    // 事务保证删除原子性：关联记录与用户同时删除，防止中间状态
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
    this.logger.info({ userId: id }, 'User deleted');
    return { message: '删除成功' };
  }

  /**
   * 为用户分配角色
   * 采用全量覆盖方式：先删除用户所有现有角色，再批量插入新角色
   * @param userId - 用户 ID
   * @param dto - 角色 ID 列表
   * @throws BadRequestException 用户不存在时抛出
   */
  async assignRoles(userId: number, dto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessException(400, '用户不存在');

    // 事务保证全量覆盖原子性：删除旧角色和插入新角色是一个整体
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map(roleId => ({ userId, roleId })),
        });
      }
    });
    this.logger.info({ userId, roleIds: dto.roleIds }, 'Roles assigned');
    return { message: '分配成功' };
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add src/user/user.service.ts && git commit -m "feat: add business logging to UserService"
```

---

### Task 9: Add business logging to RoleService

**Files:**
- Modify: `src/role/role.service.ts`

- [ ] **Step 1: Inject PinoLogger and add log points**

Replace the contents of `src/role/role.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { PinoLogger } from 'nestjs-pino';

/**
 * 角色服务层
 * 封装角色相关的核心业务逻辑，包括角色的增删改查以及菜单分配
 */
@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RoleService.name);
  }

  /**
   * 获取所有角色列表
   * 同时返回每个角色关联的菜单信息和用户数量
   */
  async getRoleList() {
    return this.prisma.role.findMany({
      include: {
        roleMenus: { include: { menu: true } },
        _count: { select: { userRoles: true } },
      },
    });
  }

  /**
   * 根据 ID 获取单个角色详情
   * 若角色不存在则抛出 BadRequestException
   * @param id 角色 ID
   */
  async getRoleById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        roleMenus: { include: { menu: true } },
        _count: { select: { userRoles: true } },
      },
    });
    if (!role) throw new BusinessException(400, '角色不存在');
    return role;
  }

  /**
   * 新增角色
   * 创建前检查角色名和编码是否已存在，防止重复
   * @param dto 创建角色的请求数据
   */
  async addRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new BusinessException(400, '角色名或编码已存在');
    const newRole = await this.prisma.role.create({ data: dto });
    this.logger.info({ roleId: newRole.id, name: newRole.name }, 'Role created');
    return newRole;
  }

  /**
   * 更新角色信息
   * 从 dto 中提取 id，剩余字段作为更新数据
   * @param dto 包含 id 和待更新字段的复合对象
   */
  async updateRole(dto: UpdateRoleDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(400, '缺少角色ID');
    const updated = await this.prisma.role.update({ where: { id }, data });
    this.logger.info({ roleId: id }, 'Role updated');
    return updated;
  }

  /**
   * 删除角色
   * 先删除角色关联的菜单中间表和用户-角色中间表，再删除角色本身
   * @param id 角色 ID
   */
  async delRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BusinessException(400, '角色不存在');
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
    this.logger.info({ roleId: id }, 'Role deleted');
    return { message: '删除成功' };
  }

  /**
   * 为角色分配菜单权限
   * 先清空原有关联，再插入新的菜单关联记录（全量替换策略）
   * @param roleId 角色 ID
   * @param dto 包含菜单 ID 列表的请求数据
   */
  async assignMenus(roleId: number, dto: AssignMenusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BusinessException(400, '角色不存在');
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (dto.menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: dto.menuIds.map(menuId => ({ roleId, menuId })),
        });
      }
    });
    this.logger.info({ roleId, menuIds: dto.menuIds }, 'Menus assigned to role');
    return { message: '分配成功' };
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add src/role/role.service.ts && git commit -m "feat: add business logging to RoleService"
```

---

### Task 10: Add business logging to MenuService

**Files:**
- Modify: `src/menu/menu.service.ts`

- [ ] **Step 1: Inject PinoLogger and add log points**

Replace the contents of `src/menu/menu.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import { PinoLogger } from 'nestjs-pino';

/**
 * 菜单服务层
 * 封装菜单相关的核心业务逻辑，包括菜单的增删改查以及树形结构构建
 */
@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MenuService.name);
  }

  /**
   * 获取菜单树
   * 按 sortOrder 升序查询所有菜单，然后递归构建为树形结构
   */
  async getMenuTree() {
    const menus = await this.prisma.menu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  /**
   * 根据 ID 获取单个菜单
   * 若菜单不存在则抛出 BadRequestException
   * @param id 菜单 ID
   */
  async getMenuById(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BusinessException(400, '菜单不存在');
    return menu;
  }

  /**
   * 新增菜单
   * 创建前检查菜单编码是否已存在，防止重复
   * @param dto 创建菜单的请求数据
   */
  async addMenu(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessException(400, '菜单编码已存在');
    const newMenu = await this.prisma.menu.create({ data: dto });
    this.logger.info({ menuId: newMenu.id, code: newMenu.code }, 'Menu created');
    return newMenu;
  }

  /**
   * 更新菜单信息
   * 从 dto 中提取 id，剩余字段作为更新数据
   * @param dto 包含 id 和待更新字段的复合对象
   */
  async updateMenu(dto: UpdateMenuDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(400, '缺少菜单ID');
    const updated = await this.prisma.menu.update({ where: { id }, data });
    this.logger.info({ menuId: id }, 'Menu updated');
    return updated;
  }

  /**
   * 删除菜单
   * 先检查是否存在子菜单，若有子菜单则禁止删除（防止数据不一致）
   * 同时级联删除角色-菜单关联表中的相关记录
   * @param id 菜单 ID
   */
  async delMenu(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!menu) throw new BusinessException(400, '菜单不存在');
    if (menu.children.length > 0) {
      throw new BusinessException(400, '请先删除子菜单');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { menuId: id } });
      await tx.menu.delete({ where: { id } });
    });
    this.logger.info({ menuId: id }, 'Menu deleted');
    return { message: '删除成功' };
  }

  /**
   * 将扁平菜单列表构建为树形结构
   * 通过 Map 建立 id 到菜单对象的映射，利用 parentId 关联父子关系
   * @param menus 扁平菜单列表
   * @returns 树形菜单数组（仅包含根节点）
   */
  private buildTree(menus: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId)!.children.push(menu);
      } else {
        roots.push(menu);
      }
    }

    return roots;
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /d/dashboard-service && git add src/menu/menu.service.ts && git commit -m "feat: add business logging to MenuService"
```

---

### Task 11: Verification — build and run

**Files:** None

- [ ] **Step 1: Full build**

```bash
cd /d/dashboard-service && npx nest build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Start dev server and verify console output**

```bash
cd /d/dashboard-service && npx nest start
```

Expected: server starts on port 3000. Console shows pino-pretty formatted startup messages (NestJS bootstrap logs should use pino formatting).

- [ ] **Step 3: Hit health endpoint and check log output**

In another terminal:
```bash
curl http://localhost:3000/
```

Expected in server console: pino-pretty formatted HTTP request log with method=GET, url=/, statusCode=200, responseTime.

- [ ] **Step 4: Verify error logging**

```bash
curl http://localhost:3000/api/auth/getUserInfo
```

Expected in server console: pino-pretty formatted 403/401 error log from HttpExceptionFilter with method, url, statusCode.

- [ ] **Step 5: Stop server**

```bash
# Ctrl+C in server terminal
```

- [ ] **Step 6: Commit any leftover changes**

```bash
cd /d/dashboard-service && git status
```

If clean, no commit needed. If there are any remaining changes, review and commit them.
