import { IsOptional, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class UpdateMenuDto {
  @ApiProperty({ description: '菜单名称', required: false, example: '用户管理' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '菜单编码', required: false, example: 'user:list' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: '父级菜单ID', required: false, example: null })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiProperty({ description: '前端路由路径', required: false, example: '/user/list' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ description: '图标类名', required: false, example: 'UserOutlined' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '排序序号', required: false, example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({
    description: '菜单状态',
    required: false,
    enum: EntityStatus,
    example: EntityStatus.ENABLED,
  })
  @IsOptional()
  @IsInt()
  status?: number;
}
