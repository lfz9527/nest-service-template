import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class MenuNodeDto {
  @ApiProperty({ description: '菜单ID', example: 1 })
  id: number;

  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  name: string;

  @ApiProperty({ description: '权限码', example: 'user:list' })
  code: string;

  @ApiProperty({ description: '父级菜单ID', required: false, example: null })
  parentId: number | null;

  @ApiProperty({ description: '前端路由路径', required: false, example: '/user' })
  path: string | null;

  @ApiProperty({ description: '图标', required: false, example: 'UserOutlined' })
  icon: string | null;

  @ApiProperty({ description: '排序号', example: 1 })
  sortOrder: number;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLED })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '子菜单', type: [MenuNodeDto], required: false })
  children?: MenuNodeDto[];
}
