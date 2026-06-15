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
