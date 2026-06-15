import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateMenuDto {
  @IsNotEmpty({ message: '菜单名不能为空' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: '菜单编码不能为空' })
  @IsString()
  code: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
