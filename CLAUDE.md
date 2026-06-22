# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概览

NestJS 后台管理服务。提供用户/角色/菜单的增删改查，基于 Session 的 RBAC 权限控制，Prisma ORM（MySQL + MariaDB 适配器），Pino 日志。支持中英双语（`Accept-Language` 头切换，nestjs-i18n）。

## 常用命令

```bash
npm run build            # 编译 TypeScript 到 dist/
npm run start:dev        # 开发服务器（热重载）
npm run start:prod       # 生产启动（node dist/main）
npm run lint             # ESLint 检查 src/**/*.ts
npm run lint:fix         # ESLint 自动修复
npm run format           # Prettier 格式化
npm run format:check     # Prettier 格式检查（不修改文件）
npm run db:generate      # 生成 Prisma Client（schema 变更后执行）
npm run db:push          # Schema 直接同步到数据库（开发用，不生成迁移文件）
npm run db:migrate       # 执行 Prisma 迁移（生产用，生成迁移文件）
npm run db:seed          # 填充种子数据（admin/admin123, user/user123）
npm run db:setup         # 首次迁移 + 种子数据一步完成
```

## 架构

**认证流程**：Express Session 存储在 MySQL 中（express-mysql-session）。`AuthGuard` 检查 `session.userId` —— 不存在则视为未登录。公开接口以 `/public/` 为前缀，在 AuthGuard 中按路径放行。

**授权模型**：User → UserRole → Role → RoleMenu → Menu。每条 `Menu` 记录有一个 `code` 字段（如 `user:list`、`role:delete`）。在路由上使用 `@Permissions(code)` 装饰器声明所需权限码；`PermissionGuard` 查询当前用户的启用角色及其启用菜单，判断是否拥有该权限码。未标注 `@Permissions()` 的路由对所有已登录用户开放。

**全局处理管线**（在 `CommonModule` 中注册）：
1. `RateLimitGuard` — 对标注 `@RateLimit()` 的路由限流
2. `AuthGuard` — 拦截未登录请求（`/public/*` 除外）
3. `PermissionGuard` — 拦截无权限请求（仅对标注了 `@Permissions` 的路由生效）
4. `DevGuard` — 生产环境下对 `@DevOnly()` 标记的接口返回 404
5. `ResponseInterceptor` — 将控制器返回值包装为 `ApiResponse.success(data)`，message 通过 I18nContext 翻译
6. `HttpExceptionFilter` — 将异常包装为 `ApiResponse.fail(message)`，通过 I18nContext 翻译 i18nKey

**国际化（i18n）**：
- 框架：nestjs-i18n（底层 i18next）
- 翻译文件：`src/i18n/{zh-CN,en}/*.json`，按模块拆分（auth / user / role / menu / common / prisma / permission / rate-limit / validation）
- 语言解析：`AcceptLanguageResolver` 读 `Accept-Language` 请求头，缺失时兜底 `zh-CN`
- 类型生成：启动时自动生成 `src/generated/i18n.generated.ts`（`I18nTranslations` / `I18nPath` 类型）
- 业务代码抛 `BusinessException(httpCode, 'user.not_found')`，Filter 统一翻译；data 层消息注入 `I18nService` 手动 `t()`
- Prisma 错误通过 `resolvePrismaErrorKey()` 返回 `{ key, args }`，走同一翻译管线
- DTO 校验使用 `i18nValidationMessage('validation.xxx')`，配合 `I18nValidationPipe`（main.ts）
- ESLint / Prettier 忽略 `src/generated/**`（已配置）

**路由规范**：
- `/public/auth/*` — 无需登录（登录、验证码、登出）
- `/api/{module}/*` — 需登录，配合 `@Permissions()` 权限守卫
- 健康检查：`GET /` 返回 `{ status: 'ok' }`

**模块结构**：每个功能模块（auth、user、role、menu）遵循 NestJS 惯例：
```
src/{feature}/
  {feature}.module.ts
  {feature}.controller.ts
  {feature}.service.ts
  dto/*.dto.ts
```

**全局模块**（无需导入即可在任意处注入）：`PrismaModule`（导出 `PrismaService`）、`CommonModule`（守卫/拦截器/过滤器）、`LoggerModule`（导出 `PinoLogger`）。

## 关键文件

- `prisma/schema.prisma` — 数据模型（User、Role、Menu、UserRole、RoleMenu）。User 与 Role 通过 UserRole 多对多关联；Role 与 Menu 通过 RoleMenu 多对多关联。Menu 自引用实现树形层级。User 采用软删除（`deletedAt` 字段），Role/Menu 为物理删除。
- `prisma/seed.ts` — 填充管理员/普通用户账号、角色（`super_admin` / `user`）及系统菜单。
- `src/i18n/` — 翻译文件，按语言/模块拆分 JSON。新增 key 需同时在 zh-CN 和 en 中添加。
- `src/generated/` — 自动生成文件（Prisma Client + i18n 类型），禁止手动编辑。ESLint/Prettier 已忽略。
- `src/constant/` — 集中管理常量，barrel 导出。`code.ts`（业务码 + `EntityStatus` 枚举 + `HttpStatus`）、`paths.ts`（`API_PATH` 路由）、`permissions.ts`（`PERM` 权限码）、`config.defaults.ts`（`CONFIG_DEFAULTS` 默认值）、`role-code.ts`（`SUPER_ADMIN` / `USER` 角色编码）。
- `src/common/response.ts` — `ApiResponse` 静态类，`success(data, message)` 和 `fail(message)`。message 无默认值，由 Interceptor 传入翻译后的字符串。
- `src/common/exceptions/business.exception.ts` — `BusinessException` 继承 `HttpException`，构造签名 `(httpCode, i18nKey, options?)`，options 可选 `businessCode` / `args`。
- `src/common/types.ts` — `AppSession`（Session + userId + captcha）、`MenuTreeNode` 类型。

## 环境配置

启动时通过 `ConfigModule.forRoot` 加载 `.env.{NODE_ENV}` 文件。必需变量：
- `DATABASE_URL` — MySQL 连接字符串（格式：`mysql://user:pass@host:port/db`）
- `SESSION_SECRET` — Session cookie 签名密钥
- `SESSION_MAX_AGE` — Session 有效期（毫秒）
- `PORT` — 服务端口号
- `LOG_LEVEL` — Pino 日志级别（`info` / `debug` / `warn` / `error`）
- `LOG_PRETTY` — 开发环境设 `true` 启用 pino-pretty 彩色输出
- `LOG_FILE_PATH` — 生产日志文件路径（默认 `./logs/app.log`）
- `LOG_RETENTION_DAYS` — 日志保留天数
- `LOG_MAX_FILE_SIZE` — 单文件大小上限（如 `10m`）

## Prisma Client

生成路径为 `src/generated/prisma/`。使用 `@prisma/adapter-mariadb`（非默认 MySQL 驱动）。`PrismaService` 将 Prisma 日志事件桥接到 PinoLogger。开发环境下 SQL 查询（含执行耗时 `duration`）以 debug 级别输出——设置 `LOG_LEVEL=debug` 可查看。
