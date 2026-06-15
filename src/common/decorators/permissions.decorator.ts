import { SetMetadata } from '@nestjs/common';

/** 权限元数据的键名，用于从反射器中读取 */
export const PERMISSION_KEY = 'permission';

/**
 * 权限装饰器
 * 将所需的权限标识码（menu.code）附加到路由处理器的元数据中，
 * 后续由 PermissionGuard 读取并校验。
 * @param code 权限标识码，对应菜单表中的 code 字段
 */
export const Permissions = (code: string) => SetMetadata(PERMISSION_KEY, code);
