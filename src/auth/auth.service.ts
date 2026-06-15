import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as svgCaptcha from 'svg-captcha';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { AppSession } from '../common/types';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  generateCaptcha(session: AppSession): string {
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
    });
    session.captcha = captcha.text.toLowerCase();
    return captcha.data;
  }

  async login(dto: LoginDto, session: AppSession): Promise<{ userId: number; username: string }> {
    if (!session.captcha) {
      throw new BadRequestException('请先获取验证码');
    }
    if (dto.captcha.toLowerCase() !== session.captcha) {
      throw new BadRequestException('验证码错误');
    }
    delete session.captcha;

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || user.status !== 1) {
      throw new BadRequestException('用户名或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('用户名或密码错误');
    }

    session.userId = user.id;
    return { userId: user.id, username: user.username };
  }

  logout(session: AppSession): void {
    session.destroy(() => {});
  }

  async getUserInfo(userId: number) {
    const user = await this.prisma.user.findUnique({
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

    if (!user) {
      return null;
    }

    const menuMap = new Map<number, any>();
    for (const ur of user.userRoles) {
      if (ur.role.status !== 1) continue;
      for (const rm of ur.role.roleMenus) {
        if (rm.menu.status !== 1) continue;
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

  private buildMenuTree(menus: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId).children.push(menu);
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

  private sortChildren(node: any): void {
    node.children.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    for (const child of node.children) {
      this.sortChildren(child);
    }
  }
}
