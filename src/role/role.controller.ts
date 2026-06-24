import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { RoleListItemDto } from './dto/role-list-item.dto';
import { RoleDetailDto } from './dto/role-detail.dto';
import { RoleInfoDto } from './dto/role-info.dto';
import { API_PATH } from '../constant';
import { ApiResponseWrapper, ApiArrayResponse, ApiMessageResponse, ApiCommonErrorResponses } from '../common/swagger';

/** 角色管理控制器 — 提供角色的增删改查及菜单分配 */
@ApiTags('api/role')
@ApiCommonErrorResponses()
@Controller('api/role')
export class RoleController {
  constructor(private roleService: RoleService) {}

  /** GET /api/role/getRoleList — 获取全部角色（含关联菜单及用户统计） */
  @ApiOperation({ summary: '获取角色列表' })
  @ApiArrayResponse(RoleListItemDto)
  @Get(API_PATH.ROLE.LIST)
  getRoleList() {
    return this.roleService.getRoleList();
  }

  /** GET /api/role/getRoleById — 按 ID 查询角色详情 */
  @ApiOperation({ summary: '获取角色详情（含菜单）' })
  @ApiResponseWrapper(RoleDetailDto)
  @Get(API_PATH.ROLE.BY_ID)
  getRoleById(@Query('id') id: string) {
    return this.roleService.getRoleById(Number(id));
  }

  /** POST /api/role/addRole — 创建新角色 */
  @ApiOperation({ summary: '新增角色' })
  @ApiResponseWrapper(RoleInfoDto)
  @Post(API_PATH.ROLE.ADD)
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  /** POST /api/role/updateRole — 更新角色信息 */
  @ApiOperation({ summary: '更新角色' })
  @ApiResponseWrapper(RoleInfoDto)
  @Post(API_PATH.ROLE.UPDATE)
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  /** POST /api/role/delRole — 物理删除角色及其关联 */
  @ApiOperation({ summary: '删除角色' })
  @ApiMessageResponse()
  @Post(API_PATH.ROLE.DELETE)
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  /** POST /api/role/assignMenus — 全量覆盖角色菜单 */
  @ApiOperation({ summary: '为角色分配菜单' })
  @ApiMessageResponse()
  @Post(API_PATH.ROLE.ASSIGN_MENUS)
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
