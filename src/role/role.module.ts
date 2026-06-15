import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';

/**
 * 角色模块
 * 注册角色控制器和服务提供者，交由 NestJS 依赖注入容器管理
 */
@Module({
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
