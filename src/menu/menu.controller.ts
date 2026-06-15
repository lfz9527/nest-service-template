import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * 菜单控制器
 * 对外暴露菜单管理的 RESTful API 接口
 */
@Controller()
export class MenuController {
  /** 注入菜单服务层 */
  constructor(private menuService: MenuService) {}

  /** 获取菜单树（需要 menu:list 权限） */
  @Permissions('menu:list')
  @Get('/api/menu/getMenuTree')
  getMenuTree() {
    return this.menuService.getMenuTree();
  }

  /** 根据 ID 获取菜单详情（需要 menu:list 权限） */
  @Permissions('menu:list')
  @Get('/api/menu/getMenuById')
  getMenuById(@Query('id') id: string) {
    // Query 参数默认为字符串，转为数字后调用服务层
    return this.menuService.getMenuById(Number(id));
  }

  /** 新增菜单（需要 menu:add 权限） */
  @Permissions('menu:add')
  @Post('/api/menu/addMenu')
  addMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.addMenu(dto);
  }

  /** 更新菜单信息（需要 menu:update 权限） */
  @Permissions('menu:update')
  @Post('/api/menu/updateMenu')
  updateMenu(@Body() dto: UpdateMenuDto & { id: number }) {
    return this.menuService.updateMenu(dto);
  }

  /** 删除菜单（需要 menu:delete 权限） */
  @Permissions('menu:delete')
  @Post('/api/menu/delMenu')
  delMenu(@Body('id') id: number) {
    return this.menuService.delMenu(Number(id));
  }
}
