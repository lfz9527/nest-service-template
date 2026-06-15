import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

/**
 * 菜单模块
 * 注册菜单控制器和服务提供者，交由 NestJS 依赖注入容器管理
 */
@Module({
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
