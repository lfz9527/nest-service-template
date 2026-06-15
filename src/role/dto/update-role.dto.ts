import { IsOptional, IsString, IsInt } from 'class-validator';

/**
 * 更新角色 DTO（数据传输对象）
 * 用于接收前端提交的更新角色请求数据，所有字段均为可选（仅传需要修改的字段）
 */
export class UpdateRoleDto {
  /** 角色名称 */
  @IsOptional()
  @IsString()
  name?: string;

  /** 角色编码 */
  @IsOptional()
  @IsString()
  code?: string;

  /** 角色描述 */
  @IsOptional()
  @IsString()
  description?: string;

  /** 角色状态（如 0=禁用, 1=启用） */
  @IsOptional()
  @IsInt()
  status?: number;
}
