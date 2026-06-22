import { IsOptional, IsString, IsEmail, IsInt, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CONFIG_DEFAULTS } from '../../constant';

/**
 * 更新用户请求数据传输对象
 * 所有字段均为可选，仅更新提供的字段
 */
export class UpdateUserDto {
  /** 用户名 */
  @IsOptional()
  @IsString()
  username?: string;

  /** 新密码（非空时触发密码重哈希） */
  @IsOptional()
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password?: string;

  /** 邮箱 */
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.email_invalid') })
  email?: string;

  /** 手机号 */
  @IsOptional()
  @IsString()
  phone?: string;

  /** 用户状态：1-启用，0-禁用 */
  @IsOptional()
  @IsInt()
  status?: number;
}
