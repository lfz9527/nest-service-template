import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * 角色控制器
 * 对外暴露角色管理的 RESTful API 接口
 */
@Controller()
export class RoleController {
  /** 注入角色服务层 */
  constructor(private roleService: RoleService) {}

  /** 获取角色列表（需要 role:list 权限） */
  @Permissions('role:list')
  @Get('/api/role/getRoleList')
  getRoleList() {
    return this.roleService.getRoleList();
  }

  /** 根据 ID 获取角色详情（需要 role:list 权限） */
  @Permissions('role:list')
  @Get('/api/role/getRoleById')
  getRoleById(@Query('id') id: string) {
    // Query 参数默认为字符串，转为数字后调用服务层
    return this.roleService.getRoleById(Number(id));
  }

  /** 新增角色（需要 role:add 权限） */
  @Permissions('role:add')
  @Post('/api/role/addRole')
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  /** 更新角色信息（需要 role:update 权限） */
  @Permissions('role:update')
  @Post('/api/role/updateRole')
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  /** 删除角色（需要 role:delete 权限） */
  @Permissions('role:delete')
  @Post('/api/role/delRole')
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  /** 为角色分配菜单权限（需要 role:assignMenu 权限） */
  @Permissions('role:assignMenu')
  @Post('/api/role/assignMenus')
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
