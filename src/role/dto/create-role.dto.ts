import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * 创建角色 DTO（数据传输对象）
 * 用于接收前端提交的创建角色请求数据，并执行字段校验
 */
export class CreateRoleDto {
  /** 角色名称，必填且必须为字符串 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.role_name_required') })
  @IsString()
  name: string;

  /** 角色编码（唯一标识），必填且必须为字符串 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.role_code_required') })
  @IsString()
  code: string;

  /** 角色描述，可选字段 */
  @IsOptional()
  @IsString()
  description?: string;
}
