import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH, PERM } from '../constant';

@Controller()
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.LIST)
  getRoleList() {
    return this.roleService.getRoleList();
  }

  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.BY_ID)
  getRoleById(@Query('id') id: string) {
    return this.roleService.getRoleById(Number(id));
  }

  @Permissions(PERM.ROLE.ADD)
  @Post(API_PATH.ROLE.ADD)
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  @Permissions(PERM.ROLE.UPDATE)
  @Post(API_PATH.ROLE.UPDATE)
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  @Permissions(PERM.ROLE.DELETE)
  @Post(API_PATH.ROLE.DELETE)
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  @Permissions(PERM.ROLE.ASSIGN_MENU)
  @Post(API_PATH.ROLE.ASSIGN_MENUS)
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
