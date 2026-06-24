# 添加 Swagger 接口文档 — 设计文档

## 目标

为 nest-service-template 项目集成 Swagger (OpenAPI) 接口文档，覆盖全部接口，支持在 Swagger UI 中通过 Cookie 认证调试。

## 范围

- 全部模块：auth（公开 + 鉴权）、user、role、menu、health
- Swagger UI 挂载路径：`/api-docs`
- 接口按路由前缀分组：`public/auth`、`api/auth`、`api/user`、`api/role`、`api/menu`
- Cookie 认证（`connect.sid`），用户先在 UI 中调登录接口再调试其他接口
- 每个端点精确标注统一响应格式（`ApiResponseWrapper<T>` + 实际 data 类型）
- 所有 DTO 字段手动添加 `@ApiProperty({ description, example })`

## 前提：控制器重构

当前控制器使用 `@Controller()` 无前缀，路由全路径写在 `API_PATH` 常量中。重构为 NestJS 标准写法。

### 控制器拆分

| 现有文件 | 变更 |
|---------|------|
| `src/auth/auth.controller.ts` | **删除**，拆分为两个 controller |
| `src/auth/public-auth.controller.ts` | **新建** — `@Controller('public/auth')`，含 `getCaptcha`、`login`、`logout` |
| `src/auth/api-auth.controller.ts` | **新建** — `@Controller('api/auth')`，含 `getUserInfo` |
| `src/auth/auth.module.ts` | 注册两个 controller 替代原来的一个 |
| `src/user/user.controller.ts` | `@Controller('api/user')` |
| `src/role/role.controller.ts` | `@Controller('api/role')` |
| `src/menu/menu.controller.ts` | `@Controller('api/menu')` |
| `src/app.controller.ts` | 保持 `@Controller()`，`/health` 不变 |

### API_PATH 常量精简

```typescript
// 之前：全路径
USER: { LIST: '/api/user/getUserList', ... }

// 之后：方法级短路径，拼接控制器前缀使用
USER: { LIST: 'getUserList', BY_ID: 'getUserById', ... }
```

注：`AuthGuard` 和 `PermissionGuard` 中如果有路径判断逻辑，需同步更新以匹配新路径。

## Swagger 核心配置

### 依赖

```bash
npm install @nestjs/swagger swagger-ui-express
```

### main.ts 初始化

在 `NestFactory.create(AppModule)` 之后、`app.listen()` 之前添加：

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const swaggerConfig = new DocumentBuilder()
  .setTitle('后台管理服务')
  .setDescription('用户/角色/菜单管理 API')
  .setVersion('1.0')
  .addCookieAuth('connect.sid')
  .build();

const document = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api-docs', app, document);
```

### 生产环境控制

Swagger UI 在生产环境默认禁用，通过 `SWAGGER_ENABLED=true` 环境变量开关：

```typescript
if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
  SwaggerModule.setup('api-docs', app, document);
}
```

## 统一响应包装

### 问题

所有接口经由 `ResponseInterceptor` 包装为：

```json
{ "code": 0, "data": ..., "message": "操作成功" }
```

Swagger 文档需反映这一层包装，让调用方知道真正的 data 类型在 `.data` 字段内。

### 方案：`@ApiResponseWrapper()` 装饰器

新建 `src/common/swagger/response-wrapper.ts`：

```typescript
import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

class ApiResponseWrapperDto<T> {
  code: number;
  data: T;
  message: string;
}

export function ApiResponseWrapper<T extends Type>(dataType: T) {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto, dataType),
    ApiResponse({
      status: 200,
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
```

每个端点只需一行：

```typescript
@ApiResponseWrapper(UserInfoDto)
@Get('getUserInfo')
getUserInfo() { ... }
```

错误响应由 `HttpExceptionFilter` 统一处理，同样包装为 `{ code: xxx, message: "..." }`。在 controller 上通过 `@ApiResponse({ status: 400/401/403/500, ... })` 统一标注。

## DTO 注解策略

### 请求 DTO（已有 class-validator 的）

以 `CreateUserDto` 为例 — 在现有校验装饰器基础上叠加 `@ApiProperty()`：

```typescript
export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.username_required') })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码（明文，服务端 bcrypt 哈希）', example: 'Abc12345' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @MinLength(6, { message: i18nValidationMessage('validation.password_min_length') })
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

规则：
- `required: false` 对应 `@IsOptional()`
- 必填字段不加 `required`（默认 true）
- `example` 提供有意义的示例值
- `description` 使用中文，与项目 i18n 语言一致

### 响应 DTO（新建）

需要为每个接口的返回值创建响应 DTO，避免直接暴露 Prisma entity 或 service 返回的裸对象。这些 DTO 不含校验装饰器，仅含 `@ApiProperty()`：

```typescript
// src/user/dto/user-info.dto.ts
export class UserInfoDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false })
  phone?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLE })
  status: number;
}
```

### 受影响文件清单

**请求 DTO（已有文件，追加注解）**：
- `src/auth/dto/login.dto.ts`
- `src/user/dto/create-user.dto.ts`
- `src/user/dto/update-user.dto.ts`
- `src/user/dto/assign-roles.dto.ts`
- `src/role/dto/create-role.dto.ts`
- `src/role/dto/update-role.dto.ts`
- `src/role/dto/assign-menus.dto.ts`
- `src/menu/dto/create-menu.dto.ts`
- `src/menu/dto/update-menu.dto.ts`
- `src/common/dto/pagination.dto.ts`

**响应 DTO（新建）**：
- `src/user/dto/user-info.dto.ts`
- `src/user/dto/user-list.dto.ts`（分页列表）
- `src/role/dto/role-info.dto.ts`
- `src/role/dto/role-list.dto.ts`
- `src/menu/dto/menu-node.dto.ts`（树节点）
- `src/auth/dto/login-result.dto.ts`
- `src/auth/dto/captcha.dto.ts`

## 控制器注解

每个端点的注解模式：

```typescript
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('api/user')
@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiOperation({
    summary: '获取用户列表',
    description: '需权限: user:list',
  })
  @ApiResponseWrapper(UserListDto)
  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.LIST)
  getUserList(@Query() dto: PaginationDto) { ... }

  @ApiOperation({ summary: '新增用户', description: '需权限: user:add' })
  @ApiResponseWrapper(UserInfoDto)
  @Permissions(PERM.USER.ADD)
  @Post(API_PATH.USER.ADD)
  addUser(@Body() dto: CreateUserDto) { ... }
}
```

要点：
- `@ApiTags()` 在 controller 级别标注（按路由前缀分组）
- `@ApiOperation()` 在每个端点标注，`summary` 简短，`description` 写权限要求
- `@ApiResponseWrapper(ResponseDto)` 一行声明成功响应结构
- 错误响应不逐个标注，在 controller 级别统一声明 400/401/403 等
- 公开接口（`PublicAuthController`）不加 `@ApiOperation` 中的权限描述

## 鉴权处理

- `addCookieAuth('connect.sid')` — express-session 默认 cookie 名
- Swagger UI 右上角出现 🔓 Authorize 按钮
- 用户先调用 `POST /public/auth/login` 获取 session
- 之后所有 `/api/*` 请求自动携带 cookie
- 已有的 `AuthGuard`、`PermissionGuard` 保持不变，Swagger 层面不实现鉴权逻辑

## 不涉及的内容

- 不做 E2E 测试（当前项目 `test` 脚本为空，不在本次范围）
- 不修改业务逻辑，仅添加文档注解
- 不引入 Swagger CLI plugin（已决定手动 `@ApiProperty()`）
- 不处理文件上传（项目无此需求）
- 不添加 OpenAPI 3.1 / JSON Schema 导出（默认 YAML/JSON 端点由 SwaggerModule 自动提供）

## 实施步骤概览

1. 安装依赖：`@nestjs/swagger` + `swagger-ui-express`
2. 控制器重构：拆分 AuthController，所有控制器加路径前缀，精简 `API_PATH` 常量
3. 新建响应 DTO 文件
4. 为已有请求 DTO 添加 `@ApiProperty()` 注解
5. 新建 `src/common/swagger/response-wrapper.ts`
6. 为所有控制器添加 `@ApiTags`、`@ApiOperation`、`@ApiResponseWrapper`
7. 在 `main.ts` 中初始化 SwaggerModule（含生产环境开关）
8. 编译验证 + 手动验证 `/api-docs` 页面
