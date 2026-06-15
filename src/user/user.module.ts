import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/**
 * 用户管理模块
 * 注册用户管理相关的控制器和服务，处理用户 CRUD 及角色分配等业务
 */
@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
