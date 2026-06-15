import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * 创建角色 DTO（数据传输对象）
 * 用于接收前端提交的创建角色请求数据，并执行字段校验
 */
export class CreateRoleDto {
  /** 角色名称，必填且必须为字符串 */
  @IsNotEmpty({ message: '角色名不能为空' })
  @IsString()
  name: string;

  /** 角色编码（唯一标识），必填且必须为字符串 */
  @IsNotEmpty({ message: '角色编码不能为空' })
  @IsString()
  code: string;

  /** 角色描述，可选字段 */
  @IsOptional()
  @IsString()
  description?: string;
}
