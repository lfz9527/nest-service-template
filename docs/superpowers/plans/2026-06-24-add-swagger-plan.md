# Swagger 接口文档实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 nest-service-template 添加 Swagger (OpenAPI) 接口文档，覆盖全部接口，支持 Swagger UI 中的 Cookie 认证调试。

**Architecture:** 先重构控制器为 NestJS 标准路径前缀写法，拆分 AuthController 为公开/鉴权两个控制器；然后通过 @nestjs/swagger 手写装饰器（@ApiTags, @ApiOperation, @ApiProperty, 自定义 @ApiResponseWrapper）对所有接口和 DTO 标注；在 main.ts 中配置 SwaggerModule 并挂载到 /api-docs。

**Tech Stack:** @nestjs/swagger, swagger-ui-express, class-validator（已有）, class-transformer（已有）

## Global Constraints

- Swagger UI 挂载路径：`/api-docs`
- 接口按路由前缀分组：`public/auth`、`api/auth`、`api/user`、`api/role`、`api/menu`
- Cookie 认证方案：`addCookieAuth('connect.sid')`
- 生产环境默认禁用 Swagger UI，`SWAGGER_ENABLED=true` 开启
- 所有 DTO 字段手动 `@ApiProperty({ description, example })`
- 每个端点精确标注统一响应格式 `{ code, message, success, data: T }`
- 控制器重构为带路径前缀写法（`@Controller('api/user')` 等）
- 不修改业务逻辑，不引入 CLI plugin，不写 E2E 测试

---

### Task 1: 安装 Swagger 依赖

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `@nestjs/swagger`、`swagger-ui-express` 包在 node_modules 可用

- [ ] **Step 1: 安装依赖**

```bash
npm install @nestjs/swagger swagger-ui-express
```

- [ ] **Step 2: 验证安装**

```bash
node -e "require('@nestjs/swagger'); console.log('@nestjs/swagger OK')"
node -e "require('swagger-ui-express'); console.log('swagger-ui-express OK')"
```

预期：两条 OK 消息，无错误。

- [ ] **Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: 安装 @nestjs/swagger 和 swagger-ui-express"
```

---

### Task 2: 创建 Swagger 工具模块（ApiResponseWrapper + 通用装饰器）

**Files:**
- Create: `src/common/swagger/response-wrapper.ts`
- Create: `src/common/swagger/index.ts`

**Interfaces:**
- Produces:
  - `ApiResponseWrapperDto` — 统一响应包装的 Schema 类
  - `ApiResponseWrapper(dataType: Type)` — 用于标注单个资源成功响应的装饰器组合
  - `ApiPaginatedResponse(dataType: Type)` — 用于标注分页列表成功响应的装饰器组合
  - `ApiMessageResponse()` — 用于标注仅返回 message 的响应装饰器组合

- [ ] **Step 1: 创建 `src/common/swagger/response-wrapper.ts`**

```typescript
import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * 统一响应包装的 OpenAPI Schema
 * 对应 ApiResponse.success() 生成的 { code, message, success, data } 结构
 */
export class ApiResponseWrapperDto {
  /** 业务状态码，0=成功 */
  code: number;
  /** 提示消息 */
  message: string;
  /** 是否成功 */
  success: boolean;
  /** 业务数据 */
  data: unknown;
}

/**
 * 分页列表数据结构（与 ListResult 对应）
 */
export class PaginatedDataDto<T> {
  /** 数据列表 */
  list: T[];
  /** 总条数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
}

/**
 * 标注单个资源成功响应的装饰器组合
 * 生成 Swagger 文档中的 { code: 0, message, success: true, data: <T> } 结构
 *
 * @param dataType — data 字段的实际 DTO 类型
 *
 * @example
 * @ApiResponseWrapper(UserInfoDto)
 * @Get('getUserInfo')
 * getUserInfo() { ... }
 */
export function ApiResponseWrapper<T extends Type>(dataType: T) {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto, dataType),
    ApiResponse({
      status: 200,
      description: '成功',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseWrapperDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(dataType) },
            },
          },
        ],
      },
    }),
  );
}

/**
 * 标注分页列表成功响应的装饰器组合
 * 生成 Swagger 文档中的 { code: 0, data: { list: T[], total, page, pageSize } } 结构
 *
 * @param dataType — list 元素的实际 DTO 类型
 *
 * @example
 * @ApiPaginatedResponse(UserListItemDto)
 * @Get('getUserList')
 * getUserList() { ... }
 */
export function ApiPaginatedResponse<T extends Type>(dataType: T) {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto, PaginatedDataDto, dataType),
    ApiResponse({
      status: 200,
      description: '成功',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseWrapperDto) },
          {
            properties: {
              data: {
                allOf: [
                  { $ref: getSchemaPath(PaginatedDataDto) },
                  {
                    properties: {
                      list: {
                        type: 'array',
                        items: { $ref: getSchemaPath(dataType) },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    }),
  );
}

/**
 * 标注数组资源成功响应的装饰器组合
 * 生成 Swagger 文档中的 { code: 0, message, success: true, data: T[] } 结构
 *
 * @param dataType — 数组元素的 DTO 类型
 *
 * @example
 * @ApiArrayResponse(RoleListItemDto)
 * @Get('getRoleList')
 * getRoleList() { ... }
 */
export function ApiArrayResponse<T extends Type>(dataType: T) {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto, dataType),
    ApiResponse({
      status: 200,
      description: '成功',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseWrapperDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataType) },
              },
            },
          },
        ],
      },
    }),
  );
}

/**
 * 标注仅返回 message 的成功响应（无 data 或 data 为简单对象）
 *
 * @example
 * @ApiMessageResponse()
 * @Post('delUser')
 * delUser() { ... }
 */
export function ApiMessageResponse() {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto),
    ApiResponse({
      status: 200,
      description: '成功',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseWrapperDto) },
          {
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string', description: '操作结果消息' },
                },
              },
            },
          },
        ],
      },
    }),
  );
}
```

- [ ] **Step 2: 创建 barrel 导出 `src/common/swagger/index.ts`**

```typescript
export {
  ApiResponseWrapperDto,
  PaginatedDataDto,
  ApiResponseWrapper,
  ApiPaginatedResponse,
  ApiArrayResponse,
  ApiMessageResponse,
} from './response-wrapper';
```

- [ ] **Step 3: 验证编译**

```bash
npx tsc --noEmit src/common/swagger/response-wrapper.ts
```

- [ ] **Step 4: 提交**

```bash
git add src/common/swagger/
git commit -m "feat: 添加 Swagger 统一响应包装装饰器"
```

---

### Task 3: 创建响应 DTO（auth / user / role / menu / common）

**Files:**
- Create: `src/auth/dto/login-result.dto.ts`
- Create: `src/auth/dto/user-info.dto.ts`
- Create: `src/user/dto/user-list-item.dto.ts`
- Create: `src/user/dto/user-detail.dto.ts`
- Create: `src/user/dto/user-brief.dto.ts`
- Create: `src/role/dto/role-list-item.dto.ts`
- Create: `src/role/dto/role-detail.dto.ts`
- Create: `src/role/dto/role-info.dto.ts`
- Create: `src/menu/dto/menu-node.dto.ts`
- Create: `src/menu/dto/menu-info.dto.ts`

**Interfaces:**
- Consumes: `src/constant/code.ts` 中的 `EntityStatus` 枚举
- Produces: 所有控制器 Swagger 注解可直接引用的响应 DTO 类

- [ ] **Step 1: 创建 `src/auth/dto/login-result.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class LoginResultDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  userId: number;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;
}
```

- [ ] **Step 2: 创建 `src/auth/dto/user-info.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { MenuNodeDto } from '../../menu/dto/menu-node.dto';

export class UserInfoDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'admin@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  phone?: string;

  @ApiProperty({ description: '菜单/权限树', type: [MenuNodeDto] })
  menus: MenuNodeDto[];
}
```

- [ ] **Step 3: 创建 `src/user/dto/user-list-item.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class UserListItemDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  phone?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2026-06-24T12:00:00.000Z' })
  updatedAt: string;
}
```

- [ ] **Step 4: 创建 `src/user/dto/user-detail.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

class UserRoleDto {
  @ApiProperty({ description: '角色ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  name: string;

  @ApiProperty({ description: '角色编码', example: 'super_admin' })
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '拥有所有权限' })
  description?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;
}

export class UserDetailDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  phone?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2026-06-24T12:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ description: '关联角色列表', type: [UserRoleDto] })
  userRoles: UserRoleDto[];
}
```

- [ ] **Step 5: 创建 `src/user/dto/user-brief.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class UserBriefDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  phone?: string;
}
```

- [ ] **Step 6: 创建 `src/role/dto/role-list-item.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

class RoleMenuBriefDto {
  @ApiProperty({ description: '菜单ID', example: 1 })
  id: number;

  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  name: string;

  @ApiProperty({ description: '权限码', example: 'user:list' })
  code: string;
}

export class RoleListItemDto {
  @ApiProperty({ description: '角色ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  name: string;

  @ApiProperty({ description: '角色编码', example: 'super_admin' })
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '拥有所有权限' })
  description?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '关联菜单', type: [RoleMenuBriefDto] })
  roleMenus: RoleMenuBriefDto[];

  @ApiProperty({ description: '用户数量统计', example: { userRoles: 2 } })
  _count: { userRoles: number };
}
```

- [ ] **Step 7: 创建 `src/role/dto/role-detail.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

class RoleMenuDto {
  @ApiProperty({ description: '菜单ID', example: 1 })
  id: number;

  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  name: string;

  @ApiProperty({ description: '权限码', example: 'user:list' })
  code: string;
}

export class RoleDetailDto {
  @ApiProperty({ description: '角色ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  name: string;

  @ApiProperty({ description: '角色编码', example: 'super_admin' })
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '拥有所有权限' })
  description?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '关联菜单', type: [RoleMenuDto] })
  roleMenus: RoleMenuDto[];

  @ApiProperty({ description: '用户数量统计', example: { userRoles: 2 } })
  _count: { userRoles: number };
}
```

- [ ] **Step 8: 创建 `src/role/dto/role-info.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class RoleInfoDto {
  @ApiProperty({ description: '角色ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色名称', example: '运营' })
  name: string;

  @ApiProperty({ description: '角色编码', example: 'operator' })
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '日常运营权限' })
  description?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;
}
```

- [ ] **Step 9: 创建 `src/menu/dto/menu-node.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class MenuNodeDto {
  @ApiProperty({ description: '菜单ID', example: 1 })
  id: number;

  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  name: string;

  @ApiProperty({ description: '权限码', example: 'user:list' })
  code: string;

  @ApiProperty({ description: '父级菜单ID', required: false, example: null })
  parentId: number | null;

  @ApiProperty({ description: '前端路由路径', required: false, example: '/user' })
  path: string | null;

  @ApiProperty({ description: '图标', required: false, example: 'UserOutlined' })
  icon: string | null;

  @ApiProperty({ description: '排序号', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '子菜单', type: [MenuNodeDto], required: false })
  children?: MenuNodeDto[];
}
```

- [ ] **Step 10: 创建 `src/menu/dto/menu-info.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class MenuInfoDto {
  @ApiProperty({ description: '菜单ID', example: 1 })
  id: number;

  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  name: string;

  @ApiProperty({ description: '权限码', example: 'user:list' })
  code: string;

  @ApiProperty({ description: '父级菜单ID', required: false, example: null })
  parentId: number | null;

  @ApiProperty({ description: '前端路由路径', required: false, example: '/user' })
  path: string | null;

  @ApiProperty({ description: '图标', required: false, example: 'UserOutlined' })
  icon: string | null;

  @ApiProperty({ description: '排序号', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;
}
```

- [ ] **Step 11: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 12: 提交**

```bash
git add src/auth/dto/login-result.dto.ts src/auth/dto/user-info.dto.ts \
  src/user/dto/user-list-item.dto.ts src/user/dto/user-detail.dto.ts src/user/dto/user-brief.dto.ts \
  src/role/dto/role-list-item.dto.ts src/role/dto/role-detail.dto.ts src/role/dto/role-info.dto.ts \
  src/menu/dto/menu-node.dto.ts src/menu/dto/menu-info.dto.ts
git commit -m "feat: 添加所有响应 DTO，为 Swagger 文档准备数据结构"
```

---

### Task 4: 为已有请求 DTO 添加 @ApiProperty 注解

**Files:**
- Modify: `src/auth/dto/login.dto.ts`
- Modify: `src/user/dto/create-user.dto.ts`
- Modify: `src/user/dto/update-user.dto.ts`
- Modify: `src/user/dto/assign-roles.dto.ts`
- Modify: `src/role/dto/create-role.dto.ts`
- Modify: `src/role/dto/update-role.dto.ts`
- Modify: `src/role/dto/assign-menus.dto.ts`
- Modify: `src/menu/dto/create-menu.dto.ts`
- Modify: `src/menu/dto/update-menu.dto.ts`
- Modify: `src/common/dto/pagination.dto.ts`

**Interfaces:**
- Consumes: `@nestjs/swagger` ApiProperty 装饰器

- [ ] **Step 1: 修改 `src/auth/dto/login.dto.ts`**

在已有校验装饰器上方叠加 `@ApiProperty()`：

```typescript
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG_DEFAULTS } from '../../constant';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.username_required') })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: 'Abc12345' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password: string;

  @ApiProperty({ description: '图形验证码', example: 'a3x9' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.captcha_required') })
  @IsString()
  captcha: string;
}
```

- [ ] **Step 2: 修改 `src/user/dto/create-user.dto.ts`**

```typescript
import { IsNotEmpty, IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG_DEFAULTS } from '../../constant';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.username_required') })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码（明文，服务端 bcrypt 哈希后入库）', example: 'Abc12345' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;
}
```

- [ ] **Step 3: 修改 `src/user/dto/update-user.dto.ts`**

```typescript
import { IsOptional, IsString, IsEmail, IsInt, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG_DEFAULTS, EntityStatus } from '../../constant';

export class UpdateUserDto {
  @ApiProperty({ description: '用户名', required: false, example: 'zhangsan' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: '新密码（非空时触发密码重哈希）', required: false, example: 'NewPass123' })
  @IsOptional()
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password?: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'newemail@example.com' })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13900139000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '用户状态', required: false, enum: EntityStatus, example: EntityStatus.ENABLE })
  @IsOptional()
  @IsInt()
  status?: number;
}
```

- [ ] **Step 4: 修改 `src/user/dto/assign-roles.dto.ts`**

```typescript
import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolesDto {
  @ApiProperty({ description: '角色 ID 数组', example: [1, 2] })
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
```

- [ ] **Step 5: 修改 `src/role/dto/create-role.dto.ts`**

```typescript
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: '角色名称', example: '运营' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.role_name_required') })
  @IsString()
  name: string;

  @ApiProperty({ description: '角色编码（唯一标识）', example: 'operator' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.role_code_required') })
  @IsString()
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '日常运营权限' })
  @IsOptional()
  @IsString()
  description?: string;
}
```

- [ ] **Step 6: 修改 `src/role/dto/update-role.dto.ts`**

```typescript
import { IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class UpdateRoleDto {
  @ApiProperty({ description: '角色名称', required: false, example: '运营' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '角色编码', required: false, example: 'operator' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '角色描述', required: false, example: '日常运营权限' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '角色状态', required: false, enum: EntityStatus, example: EntityStatus.ENABLE })
  @IsOptional()
  @IsInt()
  status?: number;
}
```

- [ ] **Step 7: 修改 `src/role/dto/assign-menus.dto.ts`**

```typescript
import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMenusDto {
  @ApiProperty({ description: '菜单 ID 数组', example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  menuIds: number[];
}
```

- [ ] **Step 8: 修改 `src/menu/dto/create-menu.dto.ts`**

```typescript
import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.menu_name_required') })
  @IsString()
  name: string;

  @ApiProperty({ description: '菜单编码（权限标识）', example: 'user:list' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.menu_code_required') })
  @IsString()
  code: string;

  @ApiProperty({ description: '父级菜单ID（用于构建树形结构）', required: false, example: null })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiProperty({ description: '前端路由路径', required: false, example: '/user/list' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ description: '图标类名', required: false, example: 'UserOutlined' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '排序序号（值越小越靠前）', required: false, example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
```

- [ ] **Step 9: 修改 `src/menu/dto/update-menu.dto.ts`**

```typescript
import { IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class UpdateMenuDto {
  @ApiProperty({ description: '菜单名称', required: false, example: '用户管理' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '菜单编码', required: false, example: 'user:list' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '父级菜单ID', required: false, example: null })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiProperty({ description: '前端路由路径', required: false, example: '/user/list' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ description: '图标类名', required: false, example: 'UserOutlined' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '排序序号', required: false, example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ description: '菜单状态', required: false, enum: EntityStatus, example: EntityStatus.ENABLE })
  @IsOptional()
  @IsInt()
  status?: number;
}
```

- [ ] **Step 10: 修改 `src/common/dto/pagination.dto.ts`**

```typescript
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({ description: '页码', required: false, default: 1, minimum: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ description: '每页条数', required: false, default: 10, minimum: 1, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
```

- [ ] **Step 11: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 12: 提交**

```bash
git add src/auth/dto/login.dto.ts \
  src/user/dto/create-user.dto.ts src/user/dto/update-user.dto.ts src/user/dto/assign-roles.dto.ts \
  src/role/dto/create-role.dto.ts src/role/dto/update-role.dto.ts src/role/dto/assign-menus.dto.ts \
  src/menu/dto/create-menu.dto.ts src/menu/dto/update-menu.dto.ts \
  src/common/dto/pagination.dto.ts
git commit -m "feat: 为所有请求 DTO 添加 @ApiProperty 注解"
```

---

### Task 5: 重构 API_PATH 常量

**Files:**
- Modify: `src/constant/paths.ts`

**Interfaces:**
- Consumes: 无
- Produces: 精简后的路径常量 — 值从全路径变为方法级短路径；`PUBLIC_PREFIX` 和 `PUBLIC_EXACT` 保持不变

- [ ] **Step 1: 修改 `src/constant/paths.ts` — 精简所有路径值**

```typescript
export const API_PATH = {
  AUTH: {
    CAPTCHA: 'getCaptcha',
    LOGIN: 'login',
    LOGOUT: 'logout',
    USER_INFO: 'getUserInfo',
  },
  USER: {
    LIST: 'getUserList',
    BY_ID: 'getUserById',
    ADD: 'addUser',
    UPDATE: 'updateUser',
    DELETE: 'delUser',
    ASSIGN_ROLES: 'assignRoles',
  },
  ROLE: {
    LIST: 'getRoleList',
    BY_ID: 'getRoleById',
    ADD: 'addRole',
    UPDATE: 'updateRole',
    DELETE: 'delRole',
    ASSIGN_MENUS: 'assignMenus',
  },
  MENU: {
    TREE: 'getMenuTree',
    BY_ID: 'getMenuById',
    ADD: 'addMenu',
    UPDATE: 'updateMenu',
    DELETE: 'delMenu',
  },
  /** 公开路径前缀 — AuthGuard 中以 /public/ 开头的路径无需登录 */
  PUBLIC_PREFIX: '/public/',
  /** 精确匹配的公开路径 — AuthGuard 中对这些路径直接放行 */
  PUBLIC_EXACT: ['/health'],
} as const;
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```
预期：编译错误 — 这是正常的，因为 controller 中的 `@Get(API_PATH.USER.LIST)` 现在传入短路径而非全路径。后续任务会同步更新 controller 添加路径前缀。

- [ ] **Step 3: 提交**

```bash
git add src/constant/paths.ts
git commit -m "refactor: API_PATH 常量从全路径精简为方法级短路径"
```

---

### Task 6: 拆分 AuthController + 重写所有控制器（路径前缀 + Swagger 装饰器）

这部分按模块分为 4 个子任务。每个子任务完成后可独立验证。

---

#### Task 6a: 创建 PublicAuthController + ApiAuthController，更新 AuthModule

**Files:**
- Create: `src/auth/public-auth.controller.ts`
- Create: `src/auth/api-auth.controller.ts`
- Modify: `src/auth/auth.module.ts`
- Delete: `src/auth/auth.controller.ts`

**Interfaces:**
- Consumes: `API_PATH` 常量（Task 5）、响应 DTO `LoginResultDto`/`UserInfoDto`（Task 3）、`ApiResponseWrapper`/`ApiMessageResponse`（Task 2）
- Produces: 两个新 controller 替代原 AuthController

- [ ] **Step 1: 创建 `src/auth/public-auth.controller.ts`**

```typescript
import { Controller, Get, Post, Body, Session } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResultDto } from './dto/login-result.dto';
import { AppSession } from '../common/types';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { API_PATH, CONFIG_DEFAULTS } from '../constant';
import { ApiResponseWrapper, ApiMessageResponse } from '../common/swagger';
import { I18nService } from 'nestjs-i18n';

@ApiTags('public/auth')
@Controller('public/auth')
export class PublicAuthController {
  constructor(
    private authService: AuthService,
    private i18n: I18nService,
  ) {}

  @ApiOperation({ summary: '获取图形验证码' })
  @ApiResponse({ status: 200, description: 'SVG 验证码图片', schema: { type: 'string' } })
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_MAX,
  })
  @Get(API_PATH.AUTH.CAPTCHA)
  getCaptcha(@Session() session: AppSession) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  @ApiOperation({ summary: '用户登录' })
  @ApiResponseWrapper(LoginResultDto)
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_MAX,
  })
  @Post(API_PATH.AUTH.LOGIN)
  login(@Body() dto: LoginDto, @Session() session: AppSession) {
    return this.authService.login(dto, session);
  }

  @ApiOperation({ summary: '用户登出' })
  @ApiMessageResponse()
  @Post(API_PATH.AUTH.LOGOUT)
  logout(@Session() session: AppSession) {
    this.authService.logout(session);
    return { message: this.i18n.t('auth.logout_success') };
  }
}
```

- [ ] **Step 2: 创建 `src/auth/api-auth.controller.ts`**

```typescript
import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { UserInfoDto } from './dto/user-info.dto';
import { AppSession } from '../common/types';
import { API_PATH } from '../constant';
import { ApiResponseWrapper } from '../common/swagger';

@ApiTags('api/auth')
@Controller('api/auth')
export class ApiAuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: '获取当前用户信息（含权限菜单树）', description: '需登录' })
  @ApiResponseWrapper(UserInfoDto)
  @Get(API_PATH.AUTH.USER_INFO)
  async getUserInfo(@Req() req: Request) {
    const session = req.session as AppSession;
    return this.authService.getUserInfo(session.userId!);
  }
}
```

- [ ] **Step 3: 修改 `src/auth/auth.module.ts` — 注册两个 controller**

```typescript
import { Module } from '@nestjs/common';
import { PublicAuthController } from './public-auth.controller';
import { ApiAuthController } from './api-auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [PublicAuthController, ApiAuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 4: 删除旧文件 `src/auth/auth.controller.ts`**

```bash
rm src/auth/auth.controller.ts
```

- [ ] **Step 5: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: 提交**

```bash
git add src/auth/public-auth.controller.ts src/auth/api-auth.controller.ts src/auth/auth.module.ts
git rm src/auth/auth.controller.ts
git commit -m "refactor: 拆分 AuthController 为 PublicAuthController + ApiAuthController，添加 Swagger 注解"
```

---

#### Task 6b: 重构 UserController（路径前缀 + Swagger 装饰器）

**Files:**
- Modify: `src/user/user.controller.ts`

**Interfaces:**
- Consumes: `API_PATH.USER.*`（Task 5）、响应 DTO（Task 3）、`ApiPaginatedResponse`/`ApiResponseWrapper`/`ApiMessageResponse`（Task 2）

- [ ] **Step 1: 重写 `src/user/user.controller.ts`**

```typescript
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UserDetailDto } from './dto/user-detail.dto';
import { UserBriefDto } from './dto/user-brief.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH, PERM, CONFIG_DEFAULTS } from '../constant';
import { ApiPaginatedResponse, ApiResponseWrapper, ApiMessageResponse } from '../common/swagger';

@ApiTags('api/user')
@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiOperation({ summary: '获取用户列表', description: '需权限: user:list' })
  @ApiPaginatedResponse(UserListItemDto)
  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.LIST)
  getUserList(@Query() dto: PaginationDto) {
    return this.userService.getUserList(
      dto.page || CONFIG_DEFAULTS.DEFAULT_PAGE,
      dto.pageSize || CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
    );
  }

  @ApiOperation({ summary: '获取用户详情（含角色）', description: '需权限: user:list' })
  @ApiResponseWrapper(UserDetailDto)
  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.BY_ID)
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @ApiOperation({ summary: '新增用户', description: '需权限: user:add' })
  @ApiResponseWrapper(UserBriefDto)
  @Permissions(PERM.USER.ADD)
  @Post(API_PATH.USER.ADD)
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  @ApiOperation({ summary: '更新用户', description: '需权限: user:update' })
  @ApiResponseWrapper(UserBriefDto)
  @Permissions(PERM.USER.UPDATE)
  @Post(API_PATH.USER.UPDATE)
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  @ApiOperation({ summary: '删除用户（软删除）', description: '需权限: user:delete' })
  @ApiMessageResponse()
  @Permissions(PERM.USER.DELETE)
  @Post(API_PATH.USER.DELETE)
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  @ApiOperation({ summary: '为用户分配角色', description: '需权限: user:assignRole' })
  @ApiMessageResponse()
  @Permissions(PERM.USER.ASSIGN_ROLE)
  @Post(API_PATH.USER.ASSIGN_ROLES)
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/user/user.controller.ts
git commit -m "refactor: UserController 添加路径前缀 @Controller('api/user') + Swagger 装饰器"
```

---

#### Task 6c: 重构 RoleController（路径前缀 + Swagger 装饰器）

**Files:**
- Modify: `src/role/role.controller.ts`

**Interfaces:**
- Consumes: `API_PATH.ROLE.*`（Task 5）、`RoleListItemDto`/`RoleDetailDto`/`RoleInfoDto`（Task 3）、Swagger 工具（Task 2）

- [ ] **Step 1: 重写 `src/role/role.controller.ts`**

```typescript
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { RoleListItemDto } from './dto/role-list-item.dto';
import { RoleDetailDto } from './dto/role-detail.dto';
import { RoleInfoDto } from './dto/role-info.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH, PERM } from '../constant';
import { ApiResponseWrapper, ApiArrayResponse, ApiMessageResponse } from '../common/swagger';

@ApiTags('api/role')
@Controller('api/role')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @ApiOperation({ summary: '获取角色列表', description: '需权限: role:list' })
  @ApiArrayResponse(RoleListItemDto)
  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.LIST)
  getRoleList() {
    return this.roleService.getRoleList();
  }

  @ApiOperation({ summary: '获取角色详情（含菜单）', description: '需权限: role:list' })
  @ApiResponseWrapper(RoleDetailDto)
  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.BY_ID)
  getRoleById(@Query('id') id: string) {
    return this.roleService.getRoleById(Number(id));
  }

  @ApiOperation({ summary: '新增角色', description: '需权限: role:add' })
  @ApiResponseWrapper(RoleInfoDto)
  @Permissions(PERM.ROLE.ADD)
  @Post(API_PATH.ROLE.ADD)
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  @ApiOperation({ summary: '更新角色', description: '需权限: role:update' })
  @ApiResponseWrapper(RoleInfoDto)
  @Permissions(PERM.ROLE.UPDATE)
  @Post(API_PATH.ROLE.UPDATE)
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  @ApiOperation({ summary: '删除角色', description: '需权限: role:delete' })
  @ApiMessageResponse()
  @Permissions(PERM.ROLE.DELETE)
  @Post(API_PATH.ROLE.DELETE)
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  @ApiOperation({ summary: '为角色分配菜单', description: '需权限: role:assignMenu' })
  @ApiMessageResponse()
  @Permissions(PERM.ROLE.ASSIGN_MENU)
  @Post(API_PATH.ROLE.ASSIGN_MENUS)
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/role/role.controller.ts
git commit -m "refactor: RoleController 添加路径前缀 @Controller('api/role') + Swagger 装饰器"
```

---

#### Task 6d: 重构 MenuController（路径前缀 + Swagger 装饰器）

**Files:**
- Modify: `src/menu/menu.controller.ts`

**Interfaces:**
- Consumes: `API_PATH.MENU.*`（Task 5）、`MenuNodeDto`/`MenuInfoDto`（Task 3）、Swagger 工具（Task 2）

- [ ] **Step 1: 重写 `src/menu/menu.controller.ts`**

```typescript
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuNodeDto } from './dto/menu-node.dto';
import { MenuInfoDto } from './dto/menu-info.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH, PERM } from '../constant';
import { ApiResponseWrapper, ApiArrayResponse, ApiMessageResponse } from '../common/swagger';

@ApiTags('api/menu')
@Controller('api/menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @ApiOperation({ summary: '获取菜单树', description: '需权限: menu:list' })
  @ApiArrayResponse(MenuNodeDto)
  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.TREE)
  getMenuTree() {
    return this.menuService.getMenuTree();
  }

  @ApiOperation({ summary: '获取菜单详情', description: '需权限: menu:list' })
  @ApiResponseWrapper(MenuInfoDto)
  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.BY_ID)
  getMenuById(@Query('id') id: string) {
    return this.menuService.getMenuById(Number(id));
  }

  @ApiOperation({ summary: '新增菜单', description: '需权限: menu:add' })
  @ApiResponseWrapper(MenuInfoDto)
  @Permissions(PERM.MENU.ADD)
  @Post(API_PATH.MENU.ADD)
  addMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.addMenu(dto);
  }

  @ApiOperation({ summary: '更新菜单', description: '需权限: menu:update' })
  @ApiResponseWrapper(MenuInfoDto)
  @Permissions(PERM.MENU.UPDATE)
  @Post(API_PATH.MENU.UPDATE)
  updateMenu(@Body() dto: UpdateMenuDto & { id: number }) {
    return this.menuService.updateMenu(dto);
  }

  @ApiOperation({ summary: '删除菜单', description: '需权限: menu:delete（有子菜单时禁止删除）' })
  @ApiMessageResponse()
  @Permissions(PERM.MENU.DELETE)
  @Post(API_PATH.MENU.DELETE)
  delMenu(@Body('id') id: number) {
    return this.menuService.delMenu(Number(id));
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/menu/menu.controller.ts
git commit -m "refactor: MenuController 添加路径前缀 @Controller('api/menu') + Swagger 装饰器"
```

---

### Task 7: 为 AppController 添加 Swagger 注解

**Files:**
- Modify: `src/app.controller.ts`

- [ ] **Step 1: 修改 `src/app.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务正常', schema: { example: { status: 'ok' } } })
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/app.controller.ts
git commit -m "feat: AppController 添加 Swagger 健康检查注解"
```

---

### Task 8: 在 main.ts 中初始化 SwaggerModule

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: 在 `main.ts` 顶部添加 Swagger 导入，在 `bootstrap()` 中初始化 SwaggerModule**

修改 `src/main.ts`：在 `import compression from 'compression';` 之后添加导入：

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
```

在 `const app = await NestFactory.create(AppModule);` 之后、`app.use(helmet());` 之前插入 Swagger 配置：

```typescript
// ── Swagger 接口文档（生产环境默认禁用，SWAGGER_ENABLED=true 开启） ──
if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('后台管理服务')
    .setDescription(
      '用户/角色/菜单管理 API\n\n' +
        '## 认证\n' +
        '本系统使用 Session Cookie 认证。\n' +
        '1. 点击右上角 **Authorize** 按钮\n' +
        '2. 先调用 `POST /public/auth/login` 获取 Session\n' +
        '3. 之后即可调用所有 `/api/*` 接口',
    )
    .setVersion('1.0')
    .addCookieAuth('connect.sid')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);
}
```

完整的 `main.ts` 应保持原有所有逻辑不变，仅增加上述 Swagger 块。

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/main.ts
git commit -m "feat: main.ts 初始化 SwaggerModule，挂载 /api-docs"
```

---

### Task 9: 构建验证 + 手动检查

- [ ] **Step 1: 构建项目**

```bash
npm run build
```

预期：`nest build` 成功，无编译错误。

- [ ] **Step 2: 查看 Swagger JSON 是否生成（可选验证）**

启动后访问 `http://localhost:<port>/api-docs-json` 确认 JSON 可读。

- [ ] **Step 3: 启动开发服务器**

```bash
npm run start:dev
```

预期：服务正常启动，日志中显示端口号。

- [ ] **Step 4: 打开 Swagger UI**

浏览器访问 `http://localhost:<port>/api-docs`，检查：
- [ ] 页面正常渲染，右上角有 **Authorize** 按钮
- [ ] 分组标签：`health`、`public/auth`、`api/auth`、`api/user`、`api/role`、`api/menu`
- [ ] 展开任意接口可以看到请求参数和响应 Schema
- [ ] 响应 Schema 中有 `{ code, message, success, data: ... }` 包装结构
- [ ] DTO 字段的描述和示例值正确显示

- [ ] **Step 5: 提交验证后的修复（如有）**

```bash
git add .
git commit -m "fix: Swagger 文档构建验证后修复"
```
