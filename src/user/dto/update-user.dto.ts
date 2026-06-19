import { IsOptional, IsString, IsEmail, IsInt, MinLength } from 'class-validator';
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
  @MinLength(CONFIG_DEFAULTS.PASSWORD_MIN_LENGTH, { message: '密码长度不能少于6位' })
  password?: string;

  /** 邮箱 */
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
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
