import { IsOptional, IsString, IsInt } from 'class-validator';

/**
 * 更新菜单 DTO（数据传输对象）
 * 用于接收前端提交的更新菜单请求数据，所有字段均为可选（仅传需要修改的字段）
 */
export class UpdateMenuDto {
  /** 菜单名称 */
  @IsOptional()
  @IsString()
  name?: string;

  /** 菜单编码 */
  @IsOptional()
  @IsString()
  code?: string;

  /** 父级菜单 ID */
  @IsOptional()
  @IsInt()
  parentId?: number;

  /** 前端路由路径 */
  @IsOptional()
  @IsString()
  path?: string;

  /** 菜单图标类名 */
  @IsOptional()
  @IsString()
  icon?: string;

  /** 排序序号 */
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  /** 菜单状态（如 0=禁用, 1=启用） */
  @IsOptional()
  @IsInt()
  status?: number;
}
