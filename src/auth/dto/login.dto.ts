import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CONFIG_DEFAULTS } from '../../constant';

/**
 * 登录请求数据传输对象
 * 包含用户名、密码和验证码三个必填字段
 */
export class LoginDto {
  /** 用户名 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.username_required') })
  @IsString()
  username: string;

  /** 密码 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password: string;

  /** 图形验证码 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.captcha_required') })
  @IsString()
  captcha: string;
}
