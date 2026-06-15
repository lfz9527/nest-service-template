import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsNotEmpty({ message: '角色名不能为空' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: '角色编码不能为空' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;
}
