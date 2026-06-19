import { IsNotEmpty, IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

/**
 * 创建用户请求数据传输对象
 * 用户名和密码为必填，邮箱和手机号为可选
 */
export class CreateUserDto {
  /** 用户名 */
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;

  /** 密码（明文，服务端会做 bcrypt 哈希后入库） */
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码长度不能少于6位' })
  password: string;

  /** 邮箱（可选） */
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  /** 手机号（可选） */
  @IsOptional()
  @IsString()
  phone?: string;
}
