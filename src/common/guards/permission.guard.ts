import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';

/**
 * 权限校验守卫
 * 检查当前登录用户是否拥有路由所要求的菜单权限码。
 * 未标记 @Permissions() 的路由直接放行。
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    // 反射器，用于读取路由 / 控制器上的元数据
    private reflector: Reflector,
    // Prisma 数据库服务
    private prisma: PrismaService,
  ) {}

  /**
   * 异步判定当前请求是否具备所需权限
   * @param context 执行上下文
   * @returns true 表示具备权限，否则抛出 ForbiddenException
   * @throws ForbiddenException 无对应权限时抛出
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 从路由处理器上读取 @Permissions() 装饰器定义的必要权限码
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    // 未设置权限要求，直接放行
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    // 用户未登录（应由 AuthGuard 提前拦截，此处作为兜底防御）
    if (!userId) {
      throw new ForbiddenException('无权限');
    }

    // 查询用户及其关联的角色、角色下启用的菜单权限
    const userWithRoles = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                roleMenus: {
                  include: { menu: true },
                },
              },
            },
          },
        },
      },
    });

    // 用户不存在（可能已被删除）
    if (!userWithRoles) {
      throw new ForbiddenException('无权限');
    }

    // 收集所有已启用角色下已启用菜单的权限码
    const menuCodes = new Set<string>();
    for (const ur of userWithRoles.userRoles) {
      // 仅处理状态为启用（status === 1）的角色
      if (ur.role.status === 1) {
        for (const rm of ur.role.roleMenus) {
          // 仅处理状态为启用（status === 1）的菜单
          if (rm.menu.status === 1) {
            menuCodes.add(rm.menu.code);
          }
        }
      }
    }

    // 判断用户是否拥有当前路由所需的权限码
    if (!menuCodes.has(requiredPermission)) {
      throw new ForbiddenException('无权限');
    }

    return true;
  }
}
