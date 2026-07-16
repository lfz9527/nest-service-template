# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概览

NestJS 后台管理服务模板。提供用户/角色/菜单的增删改查，基于 Session 的 RBAC 权限控制，Prisma ORM（MySQL + MariaDB 适配器），Pino 日志（自动生成 Request ID）。内置 CORS、Helmet 安全头、gzip 压缩。支持中英双语（`Accept-Language` 头切换，nestjs-i18n）。

## 常用命令

```bash
npm run build            # 编译 TypeScript 到 dist/
npm run start:dev        # 开发服务器（热重载）
npm run start:prod       # 生产启动（cross-env NODE_ENV=production node dist/main）
npm run lint             # ESLint 检查 src/**/*.ts
npm run lint:fix         # ESLint 自动修复
npm run format           # Prettier 格式化
npm run format:check     # Prettier 格式检查（不修改文件）
npm run test             # 运行单元 + 集成测试（Jest）
npm run test:e2e         # 运行 e2e 冒烟测试（需 DATABASE_URL）
npm run test:cov         # 运行测试并输出覆盖率报告
npm run audit            # pnpm 依赖安全审计（阻断 high/critical 漏洞）
npm run db:generate      # 生成 Prisma Client（schema 变更后执行）
npm run db:push          # Schema 直接同步到数据库（开发用，不生成迁移文件）
npm run db:migrate       # 执行 Prisma 迁移（生产用，生成迁移文件）
npm run db:seed          # 填充种子数据（admin/admin123, user/user123）
npm run db:setup         # 首次迁移 + 种子数据一步完成
```

## 架构

**启动流程**（`main.ts`）：

1. **进程级异常兜底**：注册 `unhandledRejection` / `uncaughtException` 处理器，异常时 `process.exit(1)`，由 Docker/K8s/PM2 自动重启
2. 校验必需环境变量 → 缺失则直接 `exit(1)`
3. 创建 NestJS 实例 → 加载 Helmet（安全头）+ CORS（跨域，credentials 模式）+ Compression（gzip 压缩）
4. 注册 `I18nValidationPipe`（全局校验 + i18n 错误消息）
5. 从 `DATABASE_URL` 解析 MySQL 连接参数 → 初始化 Session 存储
6. 解析端口：生产环境直接使用配置端口；开发环境端口被占用时自动切换下一个可用端口（最多尝试 100 个）
7. 注册优雅退出钩子（`enableShutdownHooks`），Docker/K8s SIGTERM 时等待当前请求完成

**认证流程**：Express Session 存储在 MySQL 中（express-mysql-session）。`AuthGuard` 检查 `session.userId` —— 不存在则视为未登录。公开接口以 `/public/` 为前缀，在 AuthGuard 中按路径放行。支持单机/多机登录模式：`SESSION_MODE=single` 时 `UserSession` 表记录当前活跃 Session，登录时踢旧、AuthGuard 校验 sessionId 不匹配则返回 402；默认 `multi` 保持原有行为。

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
- 健康检查：`GET /health` 返回 `{ status: 'ok' }`

**模块结构**：每个功能模块（auth、user、role、menu）遵循 NestJS 惯例：

```
src/{feature}/
  {feature}.module.ts
  {feature}.controller.ts
  {feature}.service.ts
  dto/*.dto.ts
```

**Swagger / OpenAPI**：

- 文档路径：开发环境 `http://localhost:{port}/api-docs`，OpenAPI JSON 通过 `/api-docs-json` 端点获取
- Swagger CLI 插件已禁用（`nest-cli.json` 无 plugins 配置）——插件会覆盖显式 `@ApiQuery` / `@ApiBody` 类型声明，导致 Apifox 参数识别错误
- POST 默认 `application/json`，无需 `@ApiConsumes`
- `@ApiBody` 支持 `examples` 字段提供请求示例：`@ApiBody({ type: LoginDto, examples: { admin: { summary: '管理员登录', value: {...} } } })`

**DTO Swagger 类型注解规则**（Apifox 兼容性关键）：

- ⚠️ TypeScript 联合类型（`number | null`、`string | null`）在运行时无法被 NestJS Swagger 反射，会错误生成为 `type: object`。必须显式加 `type` + `nullable`：
  ```typescript
  @ApiProperty({ type: Number, nullable: true, ... }) parentId: number | null;
  @ApiProperty({ type: String, nullable: true, ... }) path: string | null;
  ```
- ⚠️ 内联对象类型（如 Prisma 的 `_count: { userRoles: number }`）同样无法反射，会生成无 `properties` 的 `type: object`。必须显式声明 `properties`：
  ```typescript
  @ApiProperty({ type: 'object', properties: { userRoles: { type: 'number', ... } }, ... })
  _count: { userRoles: number };
  ```
- 普通类型（`string`、`number`、`boolean`、`Dto[]`）无需显式 `type`，框架自动推断
- 响应装饰器统一从 `src/common/swagger/response-wrapper.ts` 导入：`ApiResponseWrapper`（单资源）、`ApiPaginatedResponse`（分页）、`ApiArrayResponse`（数组）、`ApiMessageResponse`（纯消息）

**全局模块**（无需导入即可在任意处注入）：`PrismaModule`（导出 `PrismaService`）、`CommonModule`（守卫/拦截器/过滤器）、`LoggerModule`（导出 `PinoLogger`）。

## 关键文件

- `prisma/schema.prisma` — 数据模型（User、Role、Menu、UserRole、RoleMenu、UserSession）。User 与 Role 通过 UserRole 多对多关联；Role 与 Menu 通过 RoleMenu 多对多关联。Menu 自引用实现树形层级。User、Role、Menu 均为物理删除，Prisma Cascade 自动清理关联表。`UserSession` 记录单机登录模式下的活跃 Session（`userId` 主键 + `sessionId`）。
- `prisma/seed.ts` — 填充管理员/普通用户账号、角色（`super_admin` / `user`）及系统菜单。
- `src/i18n/` — 翻译文件，按语言/模块拆分 JSON。新增 key 需同时在 zh-CN 和 en 中添加。
- `src/generated/` — 自动生成文件（Prisma Client + i18n 类型），禁止手动编辑。ESLint/Prettier 已忽略。
- `src/constant/` — 集中管理常量，barrel 导出。`code.ts`（业务码 + `EntityStatus` 枚举 + `HttpStatus`，含 `KICKED_OFF=402`）、`paths.ts`（`API_PATH` 路由）、`permissions.ts`（`PERM` 权限码）、`role-code.ts`（`SUPER_ADMIN` / `USER` 角色编码）、`session-mode.ts`（`SESSION_MODE.SINGLE` / `SESSION_MODE.MULTI` 模式常量）、`prisma-codes.ts`（`PRISMA_CODES` Prisma 错误码常量）。
- `src/common/response.ts` — `ApiResponse` 静态类，`success(data, message)` 和 `fail(message)`。message 无默认值，由 Interceptor 传入翻译后的字符串。
- `src/common/exceptions/business.exception.ts` — `BusinessException` 继承 `HttpException`，构造签名 `(httpCode, i18nKey, options?)`，options 可选 `businessCode` / `args`。
- `src/common/types.ts` — `AppSession`（Session + userId + captcha）、`MenuTreeNode` 类型。
- `src/common/dto/pagination.dto.ts` — 可复用分页 DTO，含 `page`/`pageSize`（可选，最小 1），`@Type(() => Number)` 自动做 query → number 转换。
- `src/common/swagger/response-wrapper.ts` — 统一响应包装装饰器（`ApiResponseWrapper`、`ApiPaginatedResponse`、`ApiArrayResponse`、`ApiMessageResponse`、`ApiHealthResponse`、`ApiCommonErrorResponses`）。
- `scripts/check-doc-update.sh` — `Stop` + `PostToolUse` hook 脚本，检测源码变更并注入 CLAUDE.md 更新提醒。
- `.claude/settings.local.json` — 项目级本地设置（权限、hooks），不提交到仓库。
- `src/logger/logger.module.ts` — Pino 日志配置，`genReqId` 使用 `randomUUID()` 为每个请求生成唯一 ID；开发环境 pino-pretty 彩色输出，生产环境双 target（stdout JSON + pino-roll 文件轮转）。

## 测试

**框架**：Jest + ts-jest + supertest + jest-mock-extended。

- 配置：`jest.config.ts`（单元/集成测试，diagnostics 关闭以兼容 Prisma deep mock）+ `jest-e2e.json`（e2e 测试）
- 测试与源码同模块共置：`src/{module}/*.spec.ts`（单元/集成）、`src/app.e2e-spec.ts`（e2e 冒烟）
- Mock PrismaService + PinoLogger + I18nService，纯 Service 层业务逻辑
- e2e 冒烟：完整 AppModule，需 DATABASE_URL 配置的真实数据库
- 覆盖率阈值：statements/lines 50%，branches/functions 48%

## 容器化部署

| 文件                  | 用途                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `Dockerfile`          | 多阶段构建（stage1 编译 TS → stage2 `node:22-alpine` 运行时），PM2 runtime，非 root 用户 |
| `docker-compose.yml`  | 一键编排 app + MySQL 8.4，healthcheck 依赖顺序                                           |
| `.dockerignore`       | 排除 node_modules / dist / .env / coverage 等                                            |
| `ecosystem.config.js` | PM2 cluster 模式（`instances: 'max'`），400MB 内存上限，10s 优雅退出                     |

## CI/CD

GitHub Actions 流水线（`.github/workflows/ci.yml`）：

| Job      | 触发              | 说明                                                      |
| -------- | ----------------- | --------------------------------------------------------- |
| `lint`   | PR / push to main | ESLint + Prettier                                         |
| `test`   | PR / push to main | Jest + 覆盖率                                             |
| `audit`  | PR / push to main | `pnpm audit --audit-level=high`，阻断高危漏洞             |
| `build`  | PR / push to main | 依赖 lint+test+audit 全过                                 |
| `docker` | push to main only | 构建镜像 → 推送到 `ghcr.io/lfz9527/nest-service-template` |

## Claude Code Hooks

配置在 `.claude/settings.local.json`，自动检测源码变更并提醒更新本文档：

| Hook          | 事件                 | 触发时机                        |
| ------------- | -------------------- | ------------------------------- |
| `PostToolUse` | `Bash(git commit *)` | `git commit` 执行后立即注入提醒 |
| `Stop`        | —                    | 会话结束时兜底检测              |

检测逻辑（`scripts/check-doc-update.sh`）：检查未提交变更 + 最近一次 commit，只要涉及 `.ts`/`.json`/`.prisma`/`.md` 源文件即输出 `additionalContext` 注入到下次会话。

## 环境配置

启动时通过 `ConfigModule.forRoot` 加载 `.env.{NODE_ENV}` 文件。必需变量：

- `DATABASE_URL` — MySQL 连接字符串（格式：`mysql://user:pass@host:port/db`）
- `SESSION_SECRET` — Session cookie 签名密钥
- `SESSION_MAX_AGE` — Session 有效期（毫秒）
- `SESSION_MODE` — 登录模式（可选，`single` 单机 / `multi` 多机，默认 `multi`）
- `PORT` — 服务端口号
- `LOG_LEVEL` — Pino 日志级别（`info` / `debug` / `warn` / `error`）
- `LOG_PRETTY` — 开发环境设 `true` 启用 pino-pretty 彩色输出
- `LOG_FILE_PATH` — 生产日志文件路径（默认 `./logs/app.log`）
- `LOG_RETENTION_DAYS` — 日志保留天数
- `LOG_MAX_FILE_SIZE` — 单文件大小上限（如 `10m`）

所有业务配置项（bcrypt 盐轮数、验证码参数、限流阈值、分页默认值等）均通过环境变量控制，在代码中以 `process.env.XXX || 默认值` 模式读取，完整列表见 `.env.example`。

## Prisma Client

生成路径为 `src/generated/prisma/`。使用 `@prisma/adapter-mariadb`（非默认 MySQL 驱动）。`PrismaService` 将 Prisma 日志事件桥接到 PinoLogger。开发环境下 SQL 查询（含执行耗时 `duration`）以 debug 级别输出——设置 `LOG_LEVEL=debug` 可查看。
