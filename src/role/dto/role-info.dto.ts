import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class RoleInfoDto {
  @ApiProperty({ description: '角色ID', example: 1 })
  id: number;

  @ApiProperty({ description: '角色名称', example: '运营' })
  name: string;

  @ApiProperty({ description: '角色编码', example: 'operator' })
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '日常运营权限' })
  description?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLED })
  status: number;

  @ApiProperty({ description: '创建时间', example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: '更新时间', example: '2026-06-24T12:00:00.000Z' })
  updatedAt: string;
}
