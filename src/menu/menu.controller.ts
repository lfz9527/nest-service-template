import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH } from '../common/paths';
import { PERM } from '../common/permissions';

@Controller()
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.TREE)
  getMenuTree() {
    return this.menuService.getMenuTree();
  }

  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.BY_ID)
  getMenuById(@Query('id') id: string) {
    return this.menuService.getMenuById(Number(id));
  }

  @Permissions(PERM.MENU.ADD)
  @Post(API_PATH.MENU.ADD)
  addMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.addMenu(dto);
  }

  @Permissions(PERM.MENU.UPDATE)
  @Post(API_PATH.MENU.UPDATE)
  updateMenu(@Body() dto: UpdateMenuDto & { id: number }) {
    return this.menuService.updateMenu(dto);
  }

  @Permissions(PERM.MENU.DELETE)
  @Post(API_PATH.MENU.DELETE)
  delMenu(@Body('id') id: number) {
    return this.menuService.delMenu(Number(id));
  }
}
