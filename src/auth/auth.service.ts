import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as svgCaptcha from 'svg-captcha';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { AppSession, MenuTreeNode } from '../common/types';
import { BusinessException } from '../common/exceptions/business.exception';
import { HttpStatus, EntityStatus, CONFIG_DEFAULTS } from '../constant';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  generateCaptcha(session: AppSession): string {
    const captcha = svgCaptcha.create({
      size: CONFIG_DEFAULTS.CAPTCHA.SIZE,
      noise: CONFIG_DEFAULTS.CAPTCHA.NOISE,
      color: true,
    });
    session.captcha = captcha.text.toLowerCase();
    return captcha.data;
  }

  async login(dto: LoginDto, session: AppSession): Promise<{ userId: number; username: string }> {
    if (!session.captcha) {
      this.logger.warn('Login failed: captcha not initialized');
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'auth.need_captcha');
    }
    if (dto.captcha.toLowerCase() !== session.captcha) {
      this.logger.warn({ username: dto.username }, 'Login failed: wrong captcha');
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'auth.captcha_wrong');
    }
    delete session.captcha;

    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });

    if (!user || user.status !== EntityStatus.ENABLED) {
      this.logger.warn({ username: dto.username }, 'Login failed: user not found or disabled');
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'auth.login_failed');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn({ username: dto.username }, 'Login failed: wrong password');
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'auth.login_failed');
    }

    session.userId = user.id;
    this.logger.info({ userId: user.id, username: user.username }, 'Login success');
    return { userId: user.id, username: user.username };
  }

  logout(session: AppSession): void {
    const userId = session.userId;
    session.destroy((err) => {
      if (err) {
        this.logger.error({ userId, err }, 'Session destroy failed');
      }
    });
    this.logger.info({ userId }, 'Logout');
  }

  async getUserInfo(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
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

    if (!user) {
      return null;
    }

    const menuMap = new Map<number, MenuTreeNode>();
    for (const ur of user.userRoles) {
      if (ur.role.status !== EntityStatus.ENABLED) continue;
      for (const rm of ur.role.roleMenus) {
        if (rm.menu.status !== EntityStatus.ENABLED) continue;
        if (!menuMap.has(rm.menu.id)) {
          menuMap.set(rm.menu.id, {
            id: rm.menu.id,
            name: rm.menu.name,
            code: rm.menu.code,
            parentId: rm.menu.parentId,
            path: rm.menu.path,
            icon: rm.menu.icon,
            sortOrder: rm.menu.sortOrder,
            children: [],
          });
        }
      }
    }

    const menus = this.buildMenuTree(Array.from(menuMap.values()));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      menus,
    };
  }

  private buildMenuTree(menus: MenuTreeNode[]): MenuTreeNode[] {
    const map = new Map<number, MenuTreeNode>();
    const roots: MenuTreeNode[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId)!.children!.push(menu);
      } else {
        roots.push(menu);
      }
    }

    roots.sort((a, b) => a.sortOrder - b.sortOrder);
    for (const root of roots) {
      this.sortChildren(root);
    }

    return roots;
  }

  private sortChildren(node: MenuTreeNode): void {
    node.children!.sort((a: MenuTreeNode, b: MenuTreeNode) => a.sortOrder - b.sortOrder);
    for (const child of node.children!) {
      this.sortChildren(child);
    }
  }
}
