import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * 认证模块
 * 注册认证相关的控制器和服务，处理登录、登出、权限等业务
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
