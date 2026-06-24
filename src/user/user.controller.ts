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
import { ApiPaginatedResponse, ApiResponseWrapper, ApiMessageResponse } from '../common/swagger';

@ApiTags('api/user')
@Controller('api/user')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiOperation({ summary: '获取用户列表', description: '需权限: user:list' })
  @ApiPaginatedResponse(UserListItemDto)
  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.LIST)
  getUserList(@Query() dto: PaginationDto) {
    return this.userService.getUserList(
      dto.page || CONFIG_DEFAULTS.DEFAULT_PAGE,
      dto.pageSize || CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
    );
  }

  @ApiOperation({ summary: '获取用户详情（含角色）', description: '需权限: user:list' })
  @ApiResponseWrapper(UserDetailDto)
  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.BY_ID)
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @ApiOperation({ summary: '新增用户', description: '需权限: user:add' })
  @ApiResponseWrapper(UserBriefDto)
  @Permissions(PERM.USER.ADD)
  @Post(API_PATH.USER.ADD)
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  @ApiOperation({ summary: '更新用户', description: '需权限: user:update' })
  @ApiResponseWrapper(UserBriefDto)
  @Permissions(PERM.USER.UPDATE)
  @Post(API_PATH.USER.UPDATE)
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  @ApiOperation({ summary: '删除用户（软删除）', description: '需权限: user:delete' })
  @ApiMessageResponse()
  @Permissions(PERM.USER.DELETE)
  @Post(API_PATH.USER.DELETE)
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  @ApiOperation({ summary: '为用户分配角色', description: '需权限: user:assignRole' })
  @ApiMessageResponse()
  @Permissions(PERM.USER.ASSIGN_ROLE)
  @Post(API_PATH.USER.ASSIGN_ROLES)
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
