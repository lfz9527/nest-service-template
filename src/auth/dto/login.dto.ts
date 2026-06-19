import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { CONFIG_DEFAULTS } from '../../constant';

/**
 * 登录请求数据传输对象
 * 包含用户名、密码和验证码三个必填字段
 */
export class LoginDto {
  /** 用户名 */
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  /** 密码 */
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, { message: '密码长度不能少于6位' })
  password: string;

  /** 图形验证码 */
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString()
  captcha: string;
}
