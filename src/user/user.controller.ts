import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UserDetailDto } from './dto/user-detail.dto';
import { UserBriefDto } from './dto/user-brief.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { API_PATH, CONFIG_DEFAULTS } from '../constant';
import { ApiPaginatedResponse, ApiResponseWrapper, ApiMessageResponse, ApiCommonErrorResponses } from '../common/swagger';

/** 用户管理控制器 — 提供用户的增删改查及角色分配 */
@ApiTags('api/user')
@ApiCommonErrorResponses()
@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  /** GET /api/user/getUserList — 分页查询用户列表 */
  @ApiOperation({ summary: '获取用户列表' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: '页码' })
  @ApiQuery({ name: 'pageSize', type: Number, required: false, example: 10, description: '每页条数' })
  @ApiPaginatedResponse(UserListItemDto)
  @Get(API_PATH.USER.LIST)
  getUserList(@Query() dto: PaginationDto) {
    return this.userService.getUserList(
      dto.page || CONFIG_DEFAULTS.DEFAULT_PAGE,
      dto.pageSize || CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
    );
  }

  /** GET /api/user/getUserById — 按 ID 查询用户详情（含关联角色） */
  @ApiOperation({ summary: '获取用户详情（含角色）' })
  @ApiQuery({ name: 'id', type: Number, required: true, example: 1, description: '用户ID' })
  @ApiResponseWrapper(UserDetailDto)
  @Get(API_PATH.USER.BY_ID)
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  /** POST /api/user/addUser — 创建新用户 */
  @ApiOperation({ summary: '新增用户' })
  @ApiResponseWrapper(UserBriefDto)
  @Post(API_PATH.USER.ADD)
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  /** POST /api/user/updateUser — 更新用户信息，id 必填其余字段可选 */
  @ApiOperation({ summary: '更新用户' })
  @ApiExtraModels(UpdateUserDto)
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateUserDto) },
        { type: 'object', properties: { id: { type: 'number', description: '用户ID', example: 1 } }, required: ['id'] },
      ],
    },
  })
  @ApiResponseWrapper(UserBriefDto)
  @Post(API_PATH.USER.UPDATE)
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  /** POST /api/user/delUser — 软删除用户 */
  @ApiOperation({ summary: '删除用户（软删除）' })
  @ApiBody({ schema: { type: 'object', properties: { id: { type: 'number', description: '用户ID', example: 1 } }, required: ['id'] } })
  @ApiMessageResponse()
  @Post(API_PATH.USER.DELETE)
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  /** POST /api/user/assignRoles — 全量覆盖用户角色 */
  @ApiOperation({ summary: '为用户分配角色' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'number', description: '用户ID', example: 1 },
        roleIds: { type: 'array', items: { type: 'number' }, description: '角色ID数组', example: [1, 2] },
      },
      required: ['userId', 'roleIds'],
    },
  })
  @ApiMessageResponse()
  @Post(API_PATH.USER.ASSIGN_ROLES)
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
