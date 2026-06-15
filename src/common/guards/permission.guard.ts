import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(PERMISSION_KEY, context.getHandler());
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.session?.userId;
    if (!userId) {
      throw new ForbiddenException('无权限');
    }

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

    if (!userWithRoles) {
      throw new ForbiddenException('无权限');
    }

    const menuCodes = new Set<string>();
    for (const ur of userWithRoles.userRoles) {
      if (ur.role.status === 1) {
        for (const rm of ur.role.roleMenus) {
          if (rm.menu.status === 1) {
            menuCodes.add(rm.menu.code);
          }
        }
      }
    }

    if (!menuCodes.has(requiredPermission)) {
      throw new ForbiddenException('无权限');
    }

    return true;
  }
}
