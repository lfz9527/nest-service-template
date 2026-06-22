import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * 创建菜单 DTO（数据传输对象）
 * 用于接收前端提交的创建菜单请求数据，并执行字段校验
 */
export class CreateMenuDto {
  /** 菜单名称，必填 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.menu_name_required') })
  @IsString()
  name: string;

  /** 菜单编码（唯一标识），必填 */
  @IsNotEmpty({ message: i18nValidationMessage('validation.menu_code_required') })
  @IsString()
  code: string;

  /** 父级菜单 ID，用于构建树形结构，可选 */
  @IsOptional()
  @IsInt()
  parentId?: number;

  /** 前端路由路径，可选 */
  @IsOptional()
  @IsString()
  path?: string;

  /** 菜单图标类名，可选 */
  @IsOptional()
  @IsString()
  icon?: string;

  /** 排序序号，值越小越靠前，可选 */
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
