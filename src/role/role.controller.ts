import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
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

  /** GET /api/role/getRoleList — 获取全部角色 */
  @ApiOperation({ summary: '获取角色列表' })
  @ApiArrayResponse(RoleListItemDto)
  @Get(API_PATH.ROLE.LIST)
  getRoleList() {
    return this.roleService.getRoleList();
  }

  /** GET /api/role/getRoleById — 按 ID 查询角色详情 */
  @ApiOperation({ summary: '获取角色详情（含菜单）' })
  @ApiQuery({ name: 'id', type: Number, required: true, example: 1, description: '角色ID' })
  @ApiResponseWrapper(RoleDetailDto)
  @Get(API_PATH.ROLE.BY_ID)
  getRoleById(@Query('id') id: string) {
    return this.roleService.getRoleById(Number(id));
  }

  /** POST /api/role/addRole — 创建新角色 */
  @ApiOperation({ summary: '新增角色' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '角色名称', example: '运营' },
        code: { type: 'string', description: '角色编码（唯一标识）', example: 'operator' },
        description: { type: 'string', description: '角色描述', example: '日常运营权限' },
      },
      required: ['name', 'code'],
    },
  })
  @ApiResponseWrapper(RoleInfoDto)
  @Post(API_PATH.ROLE.ADD)
  addRole(@Body() dto: CreateRoleDto) {
    return this.roleService.addRole(dto);
  }

  /** POST /api/role/updateRole — 更新角色，id 必填其余字段可选 */
  @ApiOperation({ summary: '更新角色' })
  @ApiExtraModels(UpdateRoleDto)
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateRoleDto) },
        { type: 'object', properties: { id: { type: 'number', description: '角色ID', example: 1 } }, required: ['id'] },
      ],
    },
  })
  @ApiResponseWrapper(RoleInfoDto)
  @Post(API_PATH.ROLE.UPDATE)
  updateRole(@Body() dto: UpdateRoleDto & { id: number }) {
    return this.roleService.updateRole(dto);
  }

  /** POST /api/role/delRole — 物理删除角色 */
  @ApiOperation({ summary: '删除角色' })
  @ApiBody({ schema: { type: 'object', properties: { id: { type: 'number', description: '角色ID', example: 1 } }, required: ['id'] } })
  @ApiMessageResponse()
  @Post(API_PATH.ROLE.DELETE)
  delRole(@Body('id') id: number) {
    return this.roleService.delRole(Number(id));
  }

  /** POST /api/role/assignMenus — 全量覆盖角色菜单 */
  @ApiOperation({ summary: '为角色分配菜单' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roleId: { type: 'number', description: '角色ID', example: 1 },
        menuIds: { type: 'array', items: { type: 'number' }, description: '菜单ID数组', example: [1, 2, 3] },
      },
      required: ['roleId', 'menuIds'],
    },
  })
  @ApiMessageResponse()
  @Post(API_PATH.ROLE.ASSIGN_MENUS)
  assignMenus(@Body('roleId') roleId: number, @Body() body: AssignMenusDto) {
    return this.roleService.assignMenus(Number(roleId), body);
  }
}
