# 消除硬编码 — 常量抽取方案设计

**日期**: 2026-06-20  
**方案**: C（分层改造，不引入新模块）

## 目标

将项目中散落的魔术数字、字符串、路径、配置值集中到少数几个 TypeScript 常量/枚举文件中，提升可维护性和类型安全。

## 新增文件

```
src/common/
  code.ts              → [改造] 增加 EntityStatus 枚举 + HttpStatus re-export
  messages.ts          → [新增] 所有中文消息常量
  paths.ts             → [新增] 所有路由路径常量
  permissions.ts       → [新增] 所有权限码常量
  config.defaults.ts   → [新增] 所有可配置默认值
```

不新增子目录，不新增 NestJS 模块。都是纯常量/枚举文件，直接 import 使用。

## 各文件设计

### 1. `src/common/code.ts`（改造）

```ts
import { HttpStatus } from '@nestjs/common';

// 业务响应码（保持向后兼容）
export const SUCCESS = 0;
export const FAIL = -1;

export { HttpStatus };

// 实体状态枚举（替代 status === 1 魔术数）
export enum EntityStatus {
  DISABLED = 0,
  ENABLED = 1,
}
```

### 2. `src/common/messages.ts`（新增）

按模块分组，使用 `as const` 保证类型安全：

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

### 3. `src/common/paths.ts`（新增）

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

### 4. `src/common/permissions.ts`（新增）

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

### 5. `src/common/config.defaults.ts`（新增）

```ts
export const CONFIG_DEFAULTS = {
  BCRYPT_SALT_ROUNDS: 10,
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  PASSWORD_MIN_LENGTH: 6,
  DB_DEFAULT_PORT: 3306,
  SESSION_SAME_SITE: 'lax' as const,
  CAPTCHA: {
    SIZE: 4,
    NOISE: 2,
  },
  RATE_LIMIT: {
    CAPTCHA_WINDOW_SECONDS: 60,
    CAPTCHA_MAX: 10,
    LOGIN_WINDOW_SECONDS: 60,
    LOGIN_MAX: 5,
    CLEANUP_INTERVAL_MS: 60_000,
  },
} as const;
```

## 改造清单（14 个文件）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `src/common/code.ts` | 新增 `EntityStatus`、re-export `HttpStatus` |
| 2 | `src/common/messages.ts` | 新增 |
| 3 | `src/common/paths.ts` | 新增 |
| 4 | `src/common/permissions.ts` | 新增 |
| 5 | `src/common/config.defaults.ts` | 新增 |
| 6 | `src/common/guards/auth.guard.ts` | 路径 → `API_PATH`，状态码 → `HttpStatus`，消息 → `MSG` |
| 7 | `src/common/guards/permission.guard.ts` | `403` → `HttpStatus`，消息 → `MSG`，`status === 1` → `EntityStatus` |
| 8 | `src/common/guards/rate-limit.guard.ts` | `429` → `HttpStatus`，消息 → `MSG`，清理间隔 → `CONFIG_DEFAULTS` |
| 9 | `src/common/guards/dev.guard.ts` | `'production'` → 常量 |
| 10 | `src/common/filters/http-exception.filter.ts` | 消息/业务码替换为常量，Prisma 错误码集中 |
| 11 | `src/auth/auth.controller.ts` + `auth.service.ts` | 路径/限流/消息/状态码替换 |
| 12 | `src/user/user.controller.ts` + `user.service.ts` + DTOs | 路径/权限码/消息/状态码/分页默认值/密码长度/bcrypt salt |
| 13 | `src/role/role.controller.ts` + `role.service.ts` | 路径/权限码/消息/状态码 |
| 14 | `src/menu/menu.controller.ts` + `menu.service.ts` | 路径/权限码/消息/状态码 |

## 改造示例

### `permission.guard.ts`

**改前**：
```ts
throw new BusinessException(403, '无权限');
ur.role.status !== 1
rm.menu.status !== 1
```

**改后**：
```ts
import { HttpStatus, EntityStatus } from '../code';
import { MSG } from '../messages';

throw new BusinessException(HttpStatus.FORBIDDEN, MSG.PERMISSION.FORBIDDEN);
ur.role.status !== EntityStatus.ENABLED
rm.menu.status !== EntityStatus.ENABLED
```

### `auth.service.ts`

**改前**：
```ts
throw new BusinessException(400, '请先获取验证码');
user.status !== 1
```

**改后**：
```ts
throw new BusinessException(HttpStatus.BAD_REQUEST, MSG.AUTH.NEED_CAPTCHA);
user.status !== EntityStatus.ENABLED
```

## 不变的部分

- `prisma/schema.prisma` 的 `@default(1)` 保持不变（这是数据库层默认值）
- `@nestjs/common` ValidationPipe / DTO 装饰器消息（`@MinLength` 的 `message`）可后续再改
- `main.ts` 的 `process.exit(1)` 保持不变
- 模块结构不变化，不新增 NestJS 模块

## 验证方式

改造完成后运行以下命令验证：

```bash
npm run build          # 编译检查
npm run lint           # ESLint 检查
npm run start:dev      # 启动确认无运行时错误
```
