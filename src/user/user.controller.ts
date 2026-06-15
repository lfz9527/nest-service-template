import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Permissions('user:list')
  @Get('/api/user/getUserList')
  getUserList(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.userService.getUserList(Number(page) || 1, Number(pageSize) || 10);
  }

  @Permissions('user:list')
  @Get('/api/user/getUserById')
  getUserById(@Query('id') id: string) {
    return this.userService.getUserById(Number(id));
  }

  @Permissions('user:add')
  @Post('/api/user/addUser')
  addUser(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  @Permissions('user:update')
  @Post('/api/user/updateUser')
  updateUser(@Body() dto: UpdateUserDto & { id: number }) {
    return this.userService.updateUser(dto);
  }

  @Permissions('user:delete')
  @Post('/api/user/delUser')
  delUser(@Body('id') id: number) {
    return this.userService.delUser(Number(id));
  }

  @Permissions('user:assignRole')
  @Post('/api/user/assignRoles')
  assignRoles(@Body('userId') userId: number, @Body() body: AssignRolesDto) {
    return this.userService.assignRoles(Number(userId), body);
  }
}
