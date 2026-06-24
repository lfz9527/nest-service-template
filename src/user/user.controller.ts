import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UserDetailDto } from './dto/user-detail.dto';
import { UserBriefDto } from './dto/user-brief.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH, PERM, CONFIG_DEFAULTS } from '../constant';
import { ApiPaginatedResponse, ApiResponseWrapper, ApiMessageResponse, ApiCommonErrorResponses } from '../common/swagger';

/** 用户管理控制器 — 提供用户的增删改查及角色分配 */
@ApiTags('api/user')
@ApiCommonErrorResponses()
@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  /** GET /api/user/getUserList — 分页查询用户列表 */
  @ApiOperation({ summary: '获取用户列表' })
  @ApiPaginatedResponse(UserListItemDto)
  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.LIST)
  getUserList(@Query() dto: PaginationDto) {
    return this.userService.getUserList(
      dto.page || CONFIG_DEFAULTS.DEFAULT_PAGE,
      dto.pageSize || CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
    );
  }

  /** GET /api/user/getUserById — 按 ID 查询用户详情（含关联角色） */
  @ApiOperation({ summary: '获取用户详情（含角色）' })
  @ApiResponseWrapper(UserDetailDto)
  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.BY_ID)
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  /** POST /api/user/addUser — 创建新用户 */
  @ApiOperation({ summary: '新增用户' })
  @ApiResponseWrapper(UserBriefDto)
  @Permissions(PERM.USER.ADD)
  @Post(API_PATH.USER.ADD)
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  /** POST /api/user/updateUser — 更新用户信息 */
  @ApiOperation({ summary: '更新用户' })
  @ApiResponseWrapper(UserBriefDto)
  @Permissions(PERM.USER.UPDATE)
  @Post(API_PATH.USER.UPDATE)
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  /** POST /api/user/delUser — 软删除用户（置 deletedAt + 禁用状态） */
  @ApiOperation({ summary: '删除用户（软删除）' })
  @ApiMessageResponse()
  @Permissions(PERM.USER.DELETE)
  @Post(API_PATH.USER.DELETE)
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  /** POST /api/user/assignRoles — 全量覆盖用户角色 */
  @ApiOperation({ summary: '为用户分配角色' })
  @ApiMessageResponse()
  @Permissions(PERM.USER.ASSIGN_ROLE)
  @Post(API_PATH.USER.ASSIGN_ROLES)
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
