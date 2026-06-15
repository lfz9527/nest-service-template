# 后端服务 — 认证授权设计

## 关键决策

| 项 | 选择 |
|---|---|
| 语言/框架 | NestJS + Prisma + MySQL |
| 认证方式 | Session + Cookie |
| 权限模型 | RBAC（当前仅菜单级） |
| 会话存储 | MySQL（express-mysql-session） |
| 登录方式 | 账号密码 + 验证码 |
| 公开接口 | `/public/` 前缀放行，`/api/` 全部需要登录 |

## 模块结构

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/
│   │   ├── auth.guard.ts          # 拦截 /api/*，放行 /public/*
│   │   └── permission.guard.ts    # 校验 @Permissions() 声明的菜单权限
│   ├── decorators/
│   │   └── permissions.decorator.ts
│   └── filters/
│       └── http-exception.filter.ts
├── auth/                          # 登录、登出、验证码、session
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   └── auth.service.ts
├── user/                          # 用户 CRUD、分配角色
│   ├── user.module.ts
│   ├── user.controller.ts
│   └── user.service.ts
├── role/                          # 角色 CRUD、分配菜单
│   ├── role.module.ts
│   ├── role.controller.ts
│   └── role.service.ts
└── menu/                          # 菜单 CRUD（树形）
    ├── menu.module.ts
    ├── menu.controller.ts
    └── menu.service.ts
```

## 数据模型

```prisma
model User {
  id            Int         @id @default(autoincrement())
  username      String      @unique
  passwordHash  String
  email         String?     @unique
  phone         String?
  status        Int         @default(1)   // 1:启用 0:禁用
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  userRoles     UserRole[]
}

model Role {
  id          Int         @id @default(autoincrement())
  name        String      @unique
  code        String      @unique
  description String?
  status      Int         @default(1)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  userRoles   UserRole[]
  roleMenus   RoleMenu[]
}

model Menu {
  id        Int        @id @default(autoincrement())
  name      String
  code      String     @unique
  parentId  Int?
  parent    Menu?      @relation("MenuTree", fields: [parentId], references: [id])
  children  Menu[]     @relation("MenuTree")
  path      String?            // 前端路由路径
  icon      String?            // 菜单图标名
  sortOrder Int        @default(0)
  status    Int        @default(1)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  roleMenus RoleMenu[]
}

model UserRole {
  userId Int
  roleId Int
  user   User @relation(fields: [userId], references: [id])
  role   Role @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
  @@map("user_roles")
}

model RoleMenu {
  roleId Int
  menuId Int
  role   Role @relation(fields: [roleId], references: [id])
  menu   Menu @relation(fields: [menuId], references: [id])
  @@id([roleId, menuId])
  @@map("role_menus")
}
```

Session 表由 express-mysql-session 自动管理。

## API 设计

### 公开接口 — `/public/`（无需登录）

| Method | Path | 说明 |
|---|---|---|
| GET | `/public/auth/getCaptcha` | 获取 SVG 验证码 |
| POST | `/public/auth/login` | 账号 + 密码 + 验证码登录 |
| POST | `/public/auth/logout` | 登出 |

### Auth（需登录，不校验权限）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/auth/getUserInfo` | 当前用户信息 + 菜单树 |

### User（需登录 + 对应权限）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/user/getUserList` | 用户列表（分页） |
| GET | `/api/user/getUserById` | 用户详情 |
| POST | `/api/user/addUser` | 创建用户 |
| POST | `/api/user/updateUser` | 编辑用户 |
| POST | `/api/user/delUser` | 删除用户 |
| POST | `/api/user/assignRoles` | 为用户分配角色 |

### Role（需登录 + 对应权限）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/role/getRoleList` | 角色列表 |
| GET | `/api/role/getRoleById` | 角色详情 |
| POST | `/api/role/addRole` | 创建角色 |
| POST | `/api/role/updateRole` | 编辑角色 |
| POST | `/api/role/delRole` | 删除角色 |
| POST | `/api/role/assignMenus` | 为角色分配菜单 |

### Menu（需登录 + 对应权限）

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/menu/getMenuTree` | 菜单树（不分页） |
| GET | `/api/menu/getMenuById` | 菜单详情 |
| POST | `/api/menu/addMenu` | 创建菜单 |
| POST | `/api/menu/updateMenu` | 编辑菜单 |
| POST | `/api/menu/delMenu` | 删除菜单 |

## 认证流程

1. `GET /public/auth/getCaptcha` → svg-captcha 生成验证码 → session 中存 captcha code → 返回 SVG 图片
2. `POST /public/auth/login` → 校验 session 中 captcha → 查用户 → 验 bcrypt 密码 → session 写入 userId
3. AuthGuard 拦截 `/api/*`：检查 `req.session.userId`，不存在则 401
4. `GET /api/auth/getUserInfo` → 返回当前用户信息 + 通过角色查到的菜单树

## 权限校验流程

1. `@Permissions('user:list')` 装饰器声明接口所需菜单 code
2. PermissionGuard → 拿 `req.session.userId` → 查 UserRole → RoleMenu → Menu
3. 用户菜单 code 集合包含所需 code 则放行，否则 403

## 验证码

- 使用 `svg-captcha` 生成 4 位 SVG 验证码
- 验证码 code 存在 session 中
- 登录时一次性消费（校验后删除 session 中的 captcha）
