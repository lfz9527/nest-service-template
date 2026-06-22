import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { API_PATH, PERM, CONFIG_DEFAULTS } from '../constant';

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.LIST)
  getUserList(@Query() dto: PaginationDto) {
    return this.userService.getUserList(
      dto.page || CONFIG_DEFAULTS.DEFAULT_PAGE,
      dto.pageSize || CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
    );
  }

  @Permissions(PERM.USER.LIST)
  @Get(API_PATH.USER.BY_ID)
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @Permissions(PERM.USER.ADD)
  @Post(API_PATH.USER.ADD)
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  @Permissions(PERM.USER.UPDATE)
  @Post(API_PATH.USER.UPDATE)
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  @Permissions(PERM.USER.DELETE)
  @Post(API_PATH.USER.DELETE)
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  @Permissions(PERM.USER.ASSIGN_ROLE)
  @Post(API_PATH.USER.ASSIGN_ROLES)
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
