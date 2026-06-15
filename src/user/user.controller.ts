import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

/**
 * 用户管理控制器
 * 处理用户的增删改查、角色分配等 HTTP 请求，所有接口均需登录并拥有对应权限
 */
@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * 分页查询用户列表
   * 需要 user:list 权限
   * GET /api/user/getUserList
   */
  @Permissions('user:list')
  @Get('/api/user/getUserList')
  getUserList(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.userService.getUserList(Number(page) || 1, Number(pageSize) || 10);
  }

  /**
   * 根据 ID 获取单个用户详情
   * 需要 user:list 权限
   * GET /api/user/getUserById
   */
  @Permissions('user:list')
  @Get('/api/user/getUserById')
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  /**
   * 新增用户
   * 需要 user:add 权限
   * POST /api/user/addUser
   */
  @Permissions('user:add')
  @Post('/api/user/addUser')
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  /**
   * 更新用户信息
   * 需要 user:update 权限
   * POST /api/user/updateUser
   */
  @Permissions('user:update')
  @Post('/api/user/updateUser')
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  /**
   * 删除用户
   * 需要 user:delete 权限
   * POST /api/user/delUser
   */
  @Permissions('user:delete')
  @Post('/api/user/delUser')
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  /**
   * 为用户分配角色（全量覆盖）
   * 需要 user:assignRole 权限
   * POST /api/user/assignRoles
   */
  @Permissions('user:assignRole')
  @Post('/api/user/assignRoles')
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
