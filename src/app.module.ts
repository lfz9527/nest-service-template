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
