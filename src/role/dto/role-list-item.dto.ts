import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

class RoleMenuBriefDto {
  @ApiProperty({ description: '菜单ID', example: 1 })
  id: number;

  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  name: string;

  @ApiProperty({ description: '权限码', example: 'user:list' })
  code: string;
}

export class RoleListItemDto {
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

  @ApiProperty({ description: '关联菜单', type: [RoleMenuBriefDto] })
  roleMenus: RoleMenuBriefDto[];

  @ApiProperty({ description: '用户数量统计', example: { userRoles: 2 } })
  _count: { userRoles: number };
}
