import { IsArray, IsInt } from 'class-validator';

/**
 * 为用户分配角色请求数据传输对象
 * 以全量覆盖方式更新用户角色：传入的角色 ID 列表将完全替换用户当前的角色
 */
export class AssignRolesDto {
  /** 角色 ID 数组 */
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
