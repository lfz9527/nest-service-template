import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { RoleListItemDto } from './dto/role-list-item.dto';
import { RoleDetailDto } from './dto/role-detail.dto';
import { RoleInfoDto } from './dto/role-info.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH, PERM } from '../constant';
import { ApiResponseWrapper, ApiArrayResponse, ApiMessageResponse } from '../common/swagger';

@ApiTags('api/role')
@Controller('api/role')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @ApiOperation({ summary: '获取角色列表', description: '需权限: role:list' })
  @ApiArrayResponse(RoleListItemDto)
  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.LIST)
  getRoleList() {
    return this.roleService.getRoleList();
  }

  @ApiOperation({ summary: '获取角色详情（含菜单）', description: '需权限: role:list' })
  @ApiResponseWrapper(RoleDetailDto)
  @Permissions(PERM.ROLE.LIST)
  @Get(API_PATH.ROLE.BY_ID)
  getRoleById(@Query('id') id: string) {
    return this.roleService.getRoleById(Number(id));
  }

  @ApiOperation({ summary: '新增角色', description: '需权限: role:add' })
  @ApiResponseWrapper(RoleInfoDto)
  @Permissions(PERM.ROLE.ADD)
  @Post(API_PATH.ROLE.ADD)
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  @ApiOperation({ summary: '更新角色', description: '需权限: role:update' })
  @ApiResponseWrapper(RoleInfoDto)
  @Permissions(PERM.ROLE.UPDATE)
  @Post(API_PATH.ROLE.UPDATE)
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  @ApiOperation({ summary: '删除角色', description: '需权限: role:delete' })
  @ApiMessageResponse()
  @Permissions(PERM.ROLE.DELETE)
  @Post(API_PATH.ROLE.DELETE)
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  @ApiOperation({ summary: '为角色分配菜单', description: '需权限: role:assignMenu' })
  @ApiMessageResponse()
  @Permissions(PERM.ROLE.ASSIGN_MENU)
  @Post(API_PATH.ROLE.ASSIGN_MENUS)
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
