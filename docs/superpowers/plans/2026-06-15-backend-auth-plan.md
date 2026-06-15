# Backend Auth Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a NestJS backend service with Session + Cookie authentication and RBAC menu-level permission control.

**Architecture:** NestJS app with 4 feature modules (auth, user, role, menu) sharing a common Prisma data layer. Authentication uses express-session with MySQL session store. Authorization uses a global AuthGuard (path-based `/public/` skip) and a PermissionGuard driven by `@Permissions()` decorator matching menu codes.

**Tech Stack:** NestJS, Prisma (MySQL), express-session + express-mysql-session, svg-captcha, bcrypt

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`
- Create: `src/main.ts`, `src/app.module.ts`, `src/app.controller.ts`
- Create: `.env`

- [ ] **Step 1: Initialize package.json and install dependencies**

```bash
cd /d/dashboard-service
npm init -y
npm install @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/config @nestjs/session
npm install prisma @prisma/client express-session express-mysql-session svg-captcha bcryptjs
npm install class-validator class-transformer
npm install -D typescript @types/node @types/express @types/express-session ts-node
npm install -D @nestjs/cli @nestjs/schematics
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": { "@/*": ["src/*"] }
  }
}
```

- [ ] **Step 3: Create tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

- [ ] **Step 4: Create nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 5: Create .env**

```
DATABASE_URL=mysql://root:password@localhost:3306/dashboard
SESSION_SECRET=change-me-to-a-random-string
```

- [ ] **Step 6: Create src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as createMySQLStore from 'express-mysql-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const MySQLStore = createMySQLStore(session);
  const sessionStore = new MySQLStore({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'dashboard',
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'fallback-secret',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

- [ ] **Step 7: Create src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

- [ ] **Step 8: Create src/app.controller.ts**

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}
```

Update `src/app.module.ts` to register the controller:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 9: Add scripts to package.json**

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main"
  }
}
```

- [ ] **Step 10: Build and verify**

```bash
npx nest build
```
Expected: No errors.

- [ ] **Step 11: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold NestJS project with session middleware"
```

---

### Task 2: Prisma Schema + Prisma Module

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/prisma/prisma.module.ts`, `src/prisma/prisma.service.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int         @id @default(autoincrement())
  username      String      @unique
  passwordHash  String
  email         String?     @unique
  phone         String?
  status        Int         @default(1)
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
  path      String?
  icon      String?
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

- [ ] **Step 3: Push schema to database**

```bash
npx prisma db push
```

- [ ] **Step 4: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Create src/prisma/prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 6: Create src/prisma/prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 7: Register PrismaModule in AppModule**

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 8: Build and verify**

```bash
npx nest build
```
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema and global PrismaModule"
```

---

### Task 3: Common Guards and Decorators

**Files:**
- Create: `src/common/decorators/permissions.decorator.ts`
- Create: `src/common/guards/auth.guard.ts`
- Create: `src/common/guards/permission.guard.ts`
- Create: `src/common/filters/http-exception.filter.ts`
- Create: `src/common/common.module.ts`

- [ ] **Step 1: Create Permissions decorator**

```typescript
// src/common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';
export const Permissions = (code: string) => SetMetadata(PERMISSION_KEY, code);
```

- [ ] **Step 2: Create session type declaration**

```typescript
// src/common/types/session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    captcha?: string;
  }
}
```

- [ ] **Step 3: Create AuthGuard**

```typescript
// src/common/guards/auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path.startsWith('/public/')) {
      return true;
    }
    if (!request.session?.userId) {
      throw new UnauthorizedException('请先登录');
    }
    return true;
  }
}
```

- [ ] **Step 4: Create PermissionGuard**

```typescript
// src/common/guards/permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      throw new ForbiddenException('无权限');
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
      throw new ForbiddenException('无权限');
    }

    const menuCodes = new Set<string>();
    for (const ur of userWithRoles.userRoles) {
      if (ur.role.status === 1) {
        for (const rm of ur.role.roleMenus) {
          if (rm.menu.status === 1) {
            menuCodes.add(rm.menu.code);
          }
        }
      }
    }

    if (!menuCodes.has(requiredPermission)) {
      throw new ForbiddenException('无权限');
    }

    return true;
  }
}
```

- [ ] **Step 5: Create HttpExceptionFilter**

```typescript
// src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message;

    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
```

- [ ] **Step 6: Create CommonModule and register everything globally**

```typescript
// src/common/common.module.ts
import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Global()
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class CommonModule {}
```

- [ ] **Step 7: Register CommonModule in AppModule**

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, CommonModule],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 8: Build and verify**

```bash
npx nest build
```
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add AuthGuard, PermissionGuard, Permissions decorator and exception filter"
```

---

### Task 4: Auth Module (Captcha, Login, Logout, GetUserInfo)

**Files:**
- Create: `src/auth/dto/login.dto.ts`
- Create: `src/auth/auth.service.ts`
- Create: `src/auth/auth.controller.ts`
- Create: `src/auth/auth.module.ts`

- [ ] **Step 1: Create login DTO**

```typescript
// src/auth/dto/login.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;

  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  captcha: string;
}
```

- [ ] **Step 2: Create AuthService**

```typescript
// src/auth/auth.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as svgCaptcha from 'svg-captcha';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { Session } from 'express-session';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  generateCaptcha(session: Session): string {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
    });
    session.captcha = captcha.text.toLowerCase();
    return captcha.data;
  }

  async login(dto: LoginDto, session: Session): Promise<{ userId: number; username: string }> {
    if (!session.captcha) {
      throw new BadRequestException('请先获取验证码');
    }
    if (dto.captcha.toLowerCase() !== session.captcha) {
      throw new BadRequestException('验证码错误');
    }
    delete session.captcha;

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || user.status !== 1) {
      throw new BadRequestException('用户名或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('用户名或密码错误');
    }

    session.userId = user.id;
    return { userId: user.id, username: user.username };
  }

  logout(session: Session): void {
    session.destroy(() => {});
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

    const menuMap = new Map<number, any>();
    for (const ur of user.userRoles) {
      if (ur.role.status !== 1) continue;
      for (const rm of ur.role.roleMenus) {
        if (rm.menu.status !== 1) continue;
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

  private buildMenuTree(menus: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId).children.push(menu);
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

  private sortChildren(node: any): void {
    node.children.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    for (const child of node.children) {
      this.sortChildren(child);
    }
  }
}
```

- [ ] **Step 3: Create AuthController**

```typescript
// src/auth/auth.controller.ts
import { Controller, Get, Post, Body, Session, Req } from '@nestjs/common';
import { Request } from 'express';
import { Session as SessionData } from 'express-session';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('/public/auth/getCaptcha')
  getCaptcha(@Session() session: SessionData) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  @Post('/public/auth/login')
  login(@Body() dto: LoginDto, @Session() session: SessionData) {
    return this.authService.login(dto, session);
  }

  @Post('/public/auth/logout')
  logout(@Session() session: SessionData) {
    this.authService.logout(session);
    return { message: '已退出' };
  }

  @Get('/api/auth/getUserInfo')
  async getUserInfo(@Req() req: Request) {
    const userId = req.session.userId!;
    return this.authService.getUserInfo(userId);
  }
}
```

- [ ] **Step 4: Create AuthModule**

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 5: Register AuthModule in AppModule**

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 6: Build and verify**

```bash
npx nest build
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add auth module with captcha, login, logout and getUserInfo"
```

---

### Task 5: User Module (CRUD + Assign Roles)

**Files:**
- Create: `src/user/dto/create-user.dto.ts`, `src/user/dto/update-user.dto.ts`, `src/user/dto/assign-roles.dto.ts`
- Create: `src/user/user.service.ts`, `src/user/user.controller.ts`, `src/user/user.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// src/user/dto/create-user.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  password: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

```typescript
// src/user/dto/update-user.dto.ts
import { IsOptional, IsString, IsEmail, IsInt } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
```

```typescript
// src/user/dto/assign-roles.dto.ts
import { IsArray, IsInt } from 'class-validator';

export class AssignRolesDto {
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
```

- [ ] **Step 2: Create UserService**

```typescript
// src/user/user.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUserList(page: number = 1, pageSize: number = 10) {
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
    return { list, total, page, pageSize };
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
      throw new BadRequestException('用户不存在');
    }
    return user;
  }

  async addUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new BadRequestException('用户名已存在');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        email: dto.email,
        phone: dto.phone,
      },
      select: { id: true, username: true, email: true, phone: true },
    });
  }

  async updateUser(dto: UpdateUserDto & { id?: number }) {
    const { id, password, ...rest } = dto;
    if (!id) throw new BadRequestException('缺少用户ID');

    const data: any = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, phone: true, status: true },
    });
  }

  async delUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('用户不存在');
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { message: '删除成功' };
  }

  async assignRoles(userId: number, dto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');

    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (dto.roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map(roleId => ({ userId, roleId })),
      });
    }
    return { message: '分配成功' };
  }
}
```

- [ ] **Step 3: Create UserController**

```typescript
// src/user/user.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Permissions('user:list')
  @Get('/api/user/getUserList')
  getUserList(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.userService.getUserList(Number(page) || 1, Number(pageSize) || 10);
  }

  @Permissions('user:list')
  @Get('/api/user/getUserById')
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @Permissions('user:add')
  @Post('/api/user/addUser')
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  @Permissions('user:update')
  @Post('/api/user/updateUser')
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  @Permissions('user:delete')
  @Post('/api/user/delUser')
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  @Permissions('user:assignRole')
  @Post('/api/user/assignRoles')
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
```

- [ ] **Step 4: Create UserModule**

```typescript
// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
```

- [ ] **Step 5: Register UserModule in AppModule**

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 6: Build and verify**

```bash
npx nest build
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add user module with CRUD and role assignment"
```

---

### Task 6: Role Module (CRUD + Assign Menus)

**Files:**
- Create: `src/role/dto/create-role.dto.ts`, `src/role/dto/update-role.dto.ts`, `src/role/dto/assign-menus.dto.ts`
- Create: `src/role/role.service.ts`, `src/role/role.controller.ts`, `src/role/role.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// src/role/dto/create-role.dto.ts
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty({ message: '角色名不能为空' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: '角色编码不能为空' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

```typescript
// src/role/dto/update-role.dto.ts
import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
```

```typescript
// src/role/dto/assign-menus.dto.ts
import { IsArray, IsInt } from 'class-validator';

export class AssignMenusDto {
  @IsArray()
  @IsInt({ each: true })
  menuIds: number[];
}
```

- [ ] **Step 2: Create RoleService**

```typescript
// src/role/role.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

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
    if (!role) throw new BadRequestException('角色不存在');
    return role;
  }

  async addRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new BadRequestException('角色名或编码已存在');
    return this.prisma.role.create({ data: dto });
  }

  async updateRole(dto: UpdateRoleDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BadRequestException('缺少角色ID');
    return this.prisma.role.update({ where: { id }, data });
  }

  async delRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BadRequestException('角色不存在');
    await this.prisma.roleMenu.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    return { message: '删除成功' };
  }

  async assignMenus(roleId: number, dto: AssignMenusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('角色不存在');
    await this.prisma.roleMenu.deleteMany({ where: { roleId } });
    if (dto.menuIds.length > 0) {
      await this.prisma.roleMenu.createMany({
        data: dto.menuIds.map(menuId => ({ roleId, menuId })),
      });
    }
    return { message: '分配成功' };
  }
}
```

- [ ] **Step 3: Create RoleController**

```typescript
// src/role/role.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller()
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Permissions('role:list')
  @Get('/api/role/getRoleList')
  getRoleList() {
    return this.roleService.getRoleList();
  }

  @Permissions('role:list')
  @Get('/api/role/getRoleById')
  getRoleById(@Query('id') id: string) {
    return this.roleService.getRoleById(Number(id));
  }

  @Permissions('role:add')
  @Post('/api/role/addRole')
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  @Permissions('role:update')
  @Post('/api/role/updateRole')
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  @Permissions('role:delete')
  @Post('/api/role/delRole')
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  @Permissions('role:assignMenu')
  @Post('/api/role/assignMenus')
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
```

- [ ] **Step 4: Create RoleModule**

```typescript
// src/role/role.module.ts
import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

@Module({
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
```

- [ ] **Step 5: Register RoleModule in AppModule**

Update `src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UserModule,
    RoleModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 6: Build and verify**

```bash
npx nest build
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add role module with CRUD and menu assignment"
```

---

### Task 7: Menu Module (CRUD + Tree)

**Files:**
- Create: `src/menu/dto/create-menu.dto.ts`, `src/menu/dto/update-menu.dto.ts`
- Create: `src/menu/menu.service.ts`, `src/menu/menu.controller.ts`, `src/menu/menu.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// src/menu/dto/create-menu.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateMenuDto {
  @IsNotEmpty({ message: '菜单名不能为空' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: '菜单编码不能为空' })
  @IsString()
  code: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
```

```typescript
// src/menu/dto/update-menu.dto.ts
import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  status?: number;
}
```

- [ ] **Step 2: Create MenuService**

```typescript
// src/menu/menu.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuTree() {
    const menus = await this.prisma.menu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  async getMenuById(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BadRequestException('菜单不存在');
    return menu;
  }

  async addMenu(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException('菜单编码已存在');
    return this.prisma.menu.create({ data: dto });
  }

  async updateMenu(dto: UpdateMenuDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BadRequestException('缺少菜单ID');
    return this.prisma.menu.update({ where: { id }, data });
  }

  async delMenu(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!menu) throw new BadRequestException('菜单不存在');
    if (menu.children.length > 0) {
      throw new BadRequestException('请先删除子菜单');
    }
    await this.prisma.roleMenu.deleteMany({ where: { menuId: id } });
    await this.prisma.menu.delete({ where: { id } });
    return { message: '删除成功' };
  }

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

- [ ] **Step 3: Create MenuController**

```typescript
// src/menu/menu.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller()
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Permissions('menu:list')
  @Get('/api/menu/getMenuTree')
  getMenuTree() {
    return this.menuService.getMenuTree();
  }

  @Permissions('menu:list')
  @Get('/api/menu/getMenuById')
  getMenuById(@Query('id') id: string) {
    return this.menuService.getMenuById(Number(id));
  }

  @Permissions('menu:add')
  @Post('/api/menu/addMenu')
  addMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.addMenu(dto);
  }

  @Permissions('menu:update')
  @Post('/api/menu/updateMenu')
  updateMenu(@Body() dto: UpdateMenuDto & { id: number }) {
    return this.menuService.updateMenu(dto);
  }

  @Permissions('menu:delete')
  @Post('/api/menu/delMenu')
  delMenu(@Body('id') id: number) {
    return this.menuService.delMenu(Number(id));
  }
}
```

- [ ] **Step 4: Create MenuModule**

```typescript
// src/menu/menu.module.ts
import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
```

- [ ] **Step 5: Register MenuModule in AppModule**

Update `src/app.module.ts`:

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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UserModule,
    RoleModule,
    MenuModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 6: Build and verify**

```bash
npx nest build
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add menu module with CRUD and tree structure"
```

---

### Task 8: Seed Data

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create prisma/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      email: 'admin@example.com',
      status: 1,
    },
  });
  console.log('Admin user:', adminUser.username);

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'admin',
      description: '拥有所有权限',
      status: 1,
    },
  });
  console.log('Admin role:', adminRole.name);

  // Create menus
  const menuData = [
    { name: '系统管理', code: 'system', path: '/system', icon: 'setting', sortOrder: 1 },
    { name: '用户管理', code: 'user:list', path: '/system/user', icon: 'user', sortOrder: 1, parentCode: 'system' },
    { name: '角色管理', code: 'role:list', path: '/system/role', icon: 'team', sortOrder: 2, parentCode: 'system' },
    { name: '菜单管理', code: 'menu:list', path: '/system/menu', icon: 'menu', sortOrder: 3, parentCode: 'system' },
  ];

  const menuMap = new Map<string, number>();

  for (const item of menuData) {
    const { parentCode, ...data } = item;
    const parentId = parentCode ? menuMap.get(parentCode) : null;
    const menu = await prisma.menu.upsert({
      where: { code: data.code },
      update: {},
      create: {
        name: data.name,
        code: data.code,
        path: data.path,
        icon: data.icon,
        sortOrder: data.sortOrder,
        parentId: parentId ?? null,
        status: 1,
      },
    });
    menuMap.set(menu.code, menu.id);
    console.log('Menu:', menu.name, '(parentId:', menu.parentId, ')');
  }

  // Assign all menus to admin role
  const allMenuIds = Array.from(menuMap.values());
  for (const menuId of allMenuIds) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: adminRole.id, menuId } },
      update: {},
      create: { roleId: adminRole.id, menuId },
    });
  }
  console.log('Assigned all menus to admin role');

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log('Assigned admin role to admin user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed command to package.json**

```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```
Expected: Log output showing admin user, role, menus created.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add seed data for admin user, role and default menus"
```

---

### Task 9: Final Build Verification

- [ ] **Step 1: Full build**

```bash
npx nest build
```
Expected: No errors, dist/ created.

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```
Expected: No type errors.

- [ ] **Step 3: Verify all files exist**

```bash
ls -la src/main.ts src/app.module.ts src/prisma/prisma.service.ts src/prisma/prisma.module.ts src/common/guards/auth.guard.ts src/common/guards/permission.guard.ts src/common/decorators/permissions.decorator.ts src/common/filters/http-exception.filter.ts src/common/common.module.ts src/common/types/session.d.ts src/auth/auth.controller.ts src/auth/auth.service.ts src/auth/auth.module.ts src/auth/dto/login.dto.ts src/user/user.controller.ts src/user/user.service.ts src/user/user.module.ts src/user/dto/create-user.dto.ts src/user/dto/update-user.dto.ts src/user/dto/assign-roles.dto.ts src/role/role.controller.ts src/role/role.service.ts src/role/role.module.ts src/role/dto/create-role.dto.ts src/role/dto/update-role.dto.ts src/role/dto/assign-menus.dto.ts src/menu/menu.controller.ts src/menu/menu.service.ts src/menu/menu.module.ts src/menu/dto/create-menu.dto.ts src/menu/dto/update-menu.dto.ts prisma/schema.prisma prisma/seed.ts .env
```
Expected: All files exist.

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "chore: final verification - all modules build cleanly"
```

---

## Implementation Order

```
Task 1 (scaffold) → Task 2 (Prisma) → Task 3 (guards) → Task 4 (auth)
                                                       → Task 5 (user)
                                                       → Task 6 (role)
                                                       → Task 7 (menu)
                                                       → Task 8 (seed)
                                                       → Task 9 (verify)
```

Tasks 4-7 can be implemented in parallel after Task 3 completes. Task 8 depends on all modules. Task 9 is the final checkpoint.
