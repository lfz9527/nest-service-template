import { IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class UpdateRoleDto {
  @ApiProperty({ description: '角色名称', required: false, example: '运营' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '角色编码', required: false, example: 'operator' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '角色描述', required: false, example: '日常运营权限' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '角色状态',
    required: false,
    enum: EntityStatus,
    example: EntityStatus.ENABLED,
  })
  @IsOptional()
  @IsInt()
  status?: number;
}
