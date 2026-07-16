import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessException } from '../business.exception';
import { FORBIDDEN, HttpStatus, EntityStatus } from '../../constant';
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
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  /** @inheritdoc */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      throw new BusinessException(HttpStatus.FORBIDDEN, 'permission.forbidden', {
        businessCode: FORBIDDEN,
      });
    }

    const userWithRoles = await this.prisma.user.findFirst({
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

    if (!userWithRoles) {
      throw new BusinessException(HttpStatus.FORBIDDEN, 'permission.forbidden', {
        businessCode: FORBIDDEN,
      });
    }

    const menuCodes = new Set<string>();
    for (const ur of userWithRoles.userRoles) {
      if (ur.role.status === EntityStatus.ENABLED) {
        for (const rm of ur.role.roleMenus) {
          if (rm.menu.status === EntityStatus.ENABLED) {
            menuCodes.add(rm.menu.code);
          }
        }
      }
    }

    if (!menuCodes.has(requiredPermission)) {
      throw new BusinessException(HttpStatus.FORBIDDEN, 'permission.forbidden', {
        businessCode: FORBIDDEN,
      });
    }

    return true;
  }
}
