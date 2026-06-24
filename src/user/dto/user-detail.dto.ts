import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

/** Prisma include 返回的 role 实体 */
class RoleDataDto {
  @ApiProperty({ description: '角色ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色名称', example: '超级管理员' })
  name: string;

  @ApiProperty({ description: '角色编码', example: 'super_admin' })
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '拥有所有权限' })
  description?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLED })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2026-06-24T12:00:00.000Z' })
  updatedAt: string;
}

/** Prisma UserRole 连接表 + include role */
class UserRoleJoinDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  userId: number;

  @ApiProperty({ description: '角色ID', example: 2 })
  roleId: number;

  @ApiProperty({ description: '角色详情' })
  role: RoleDataDto;
}

export class UserDetailDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  phone?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLED })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2026-06-24T12:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ description: '关联角色列表（含连接表字段）', type: [UserRoleJoinDto] })
  userRoles: UserRoleJoinDto[];
}
