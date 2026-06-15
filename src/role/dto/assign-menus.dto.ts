import { IsArray, IsInt } from 'class-validator';

/**
 * 分配菜单 DTO（数据传输对象）
 * 用于接收为角色分配菜单的请求，菜单 ID 列表必填
 */
export class AssignMenusDto {
  /** 菜单 ID 数组，每个元素必须是整数 */
  @IsArray()
  @IsInt({ each: true })
  menuIds: number[];
}
