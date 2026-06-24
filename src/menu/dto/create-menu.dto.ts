import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ description: '菜单名称', example: '用户管理' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.menu_name_required') })
  @IsString()
  name: string;

  @ApiProperty({ description: '菜单编码（权限标识）', example: 'user:list' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.menu_code_required') })
  @IsString()
  code: string;

  @ApiProperty({ description: '父级菜单ID（用于构建树形结构）', required: false, example: null })
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

  @ApiProperty({ description: '排序序号（值越小越靠前）', required: false, example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
