import { IsNotEmpty, IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG_DEFAULTS } from '../../constant';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.username_required') })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码（明文，服务端 bcrypt 哈希后入库）', example: 'Abc12345' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;
}
