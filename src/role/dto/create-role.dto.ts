import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ description: '角色名称', example: '运营' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.role_name_required') })
  @IsString()
  name: string;

  @ApiProperty({ description: '角色编码（唯一标识）', example: 'operator' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.role_code_required') })
  @IsString()
  code: string;

  @ApiProperty({ description: '角色描述', required: false, example: '日常运营权限' })
  @IsOptional()
  @IsString()
  description?: string;
}
