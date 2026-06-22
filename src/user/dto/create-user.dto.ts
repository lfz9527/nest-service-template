import { IsNotEmpty, IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CONFIG_DEFAULTS } from '../../constant';

/**
 * 创建用户请求数据传输对象
 * 用户名和密码为必填，邮箱和手机号为可选
 */
export class CreateUserDto {
  /** 用户名 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.username_required') })
  @IsString()
  username: string;

  /** 密码（明文，服务端会做 bcrypt 哈希后入库） */
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password: string;

  /** 邮箱（可选） */
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  email?: string;

  /** 手机号（可选） */
  @IsOptional()
  @IsString()
  phone?: string;
}
