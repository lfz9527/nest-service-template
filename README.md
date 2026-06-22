# Dashboard Service

NestJS 后台管理服务 — 用户 / 角色 / 菜单 CRUD，基于 Session 的 RBAC 权限控制，支持中英双语。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | NestJS 11 + TypeScript |
| ORM | Prisma 7 + MariaDB 适配器 |
| 数据库 | MySQL |
| 认证 | Express Session（MySQL 持久化） |
| 国际化 | nestjs-i18n（i18next），`Accept-Language` 头切换 |
| 日志 | Pino + pino-pretty（开发）/ pino-roll（生产） |
| 校验 | class-validator + I18nValidationPipe |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.development
# 编辑 .env.development 填写数据库连接等配置

# 3. 初始化数据库
npm run db:setup

# 4. 启动开发服务器
npm run start:dev
```

**默认账号**（种子数据）：
- 管理员：`admin` / `admin123`
- 普通用户：`user` / `user123`

## 国际化

服务通过 `Accept-Language` 请求头自动切换语言，缺失时兜底 `zh-CN`。

```bash
# 中文
curl http://localhost:3000/api/user/list \
  -H "Accept-Language: zh-CN" \
  -H "Cookie: ..."

# 英文
curl http://localhost:3000/api/user/list \
  -H "Accept-Language: en" \
  -H "Cookie: ..."
```

翻译文件在 `src/i18n/{zh-CN,en}/`，按模块拆分 JSON。新增 key 需同时添加中英双语。

## 接口概览

| 路径 | 登录 | 说明 |
|------|------|------|
| `GET /` | — | 健康检查 |
| `GET /public/auth/getCaptcha` | — | 获取图形验证码 |
| `POST /public/auth/login` | — | 登录 |
| `POST /public/auth/logout` | — | 登出 |
| `GET /api/auth/getUserInfo` | 是 | 当前用户信息和菜单 |
| `GET /api/user/list` | 是 | 用户列表（分页） |
| `GET /api/user/get` | 是 | 用户详情 |
| `POST /api/user/add` | 是 | 新增用户 |
| `POST /api/user/update` | 是 | 更新用户 |
| `POST /api/user/delete` | 是 | 删除用户（软删除） |
| `POST /api/user/assignRoles` | 是 | 分配角色 |
| `GET /api/role/list` | 是 | 角色列表 |
| `GET /api/role/get` | 是 | 角色详情 |
| `POST /api/role/add` | 是 | 新增角色 |
| `POST /api/role/update` | 是 | 更新角色 |
| `POST /api/role/delete` | 是 | 删除角色 |
| `POST /api/role/assignMenus` | 是 | 分配菜单 |
| `GET /api/menu/tree` | 是 | 菜单树 |
| `GET /api/menu/get` | 是 | 菜单详情 |
| `POST /api/menu/add` | 是 | 新增菜单 |
| `POST /api/menu/update` | 是 | 更新菜单 |
| `POST /api/menu/delete` | 是 | 删除菜单 |

## 统一响应格式

```json
{
  "code": 0,
  "message": "操作成功",
  "success": true,
  "data": {}
}
```

- `code` — 0 成功，-1 失败，401 未登录，403 无权限，429 限流
- `message` — 支持中英双语，由 `Accept-Language` 头控制

## 目录结构

```
src/
├── i18n/              # 翻译文件（zh-CN + en，按模块拆分 JSON）
├── generated/         # 自动生成（Prisma Client + i18n 类型），勿手动编辑
├── constant/          # 常量（业务码、EntityStatus、路由路径、权限码、默认值）
├── common/            # 全局守卫、拦截器、异常过滤器、装饰器
├── auth/              # 认证模块（登录、验证码、登出）
├── user/              # 用户管理
├── role/              # 角色管理
├── menu/              # 菜单管理
├── prisma/            # PrismaService 封装
└── logger/            # 日志模块配置
```

## 常用命令

```bash
npm run build            # 编译
npm run start:dev        # 开发（热重载）
npm run start:prod       # 生产启动
npm run lint             # ESLint
npm run lint:fix         # ESLint 修复
npm run format           # Prettier
npm run format:check     # Prettier 检查
npm run db:generate      # 生成 Prisma Client
npm run db:push          # Schema 同步（开发用）
npm run db:migrate       # 执行迁移（生产用）
npm run db:seed          # 填充种子数据
npm run db:setup         # 首次初始化（迁移 + 种子）
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | MySQL 连接字符串 | 是 |
| `SESSION_SECRET` | Session 签名密钥 | 是 |
| `SESSION_MAX_AGE` | Session 有效期（ms） | 是 |
| `PORT` | 服务端口 | 是 |
| `LOG_LEVEL` | 日志级别（debug 可查看 SQL） | 否（默认 info） |
| `LOG_PRETTY` | 开发彩色输出 | 否 |
| `LOG_FILE_PATH` | 生产日志文件路径 | 否 |
| `LOG_RETENTION_DAYS` | 日志保留天数 | 否 |
| `LOG_MAX_FILE_SIZE` | 单文件大小上限 | 否 |
