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
