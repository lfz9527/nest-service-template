import { IsOptional, IsString, IsEmail, IsInt, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG_DEFAULTS, EntityStatus } from '../../constant';

export class UpdateUserDto {
  @ApiProperty({ description: '用户名', required: false, example: 'zhangsan' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({
    description: '新密码（非空时触发密码重哈希）',
    required: false,
    example: 'NewPass123',
  })
  @IsOptional()
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password?: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'newemail@example.com' })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13900139000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '用户状态',
    required: false,
    enum: EntityStatus,
    example: EntityStatus.ENABLED,
  })
  @IsOptional()
  @IsInt()
  status?: number;
}
