import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import { MenuTreeNode } from '../common/types';
import { PinoLogger } from 'nestjs-pino';

/**
 * 菜单服务层
 * 封装菜单相关的核心业务逻辑，包括菜单的增删改查以及树形结构构建
 */
@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MenuService.name);
  }

  async getMenuTree() {
    const menus = await this.prisma.menu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  async getMenuById(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BusinessException(400, '菜单不存在');
    return menu;
  }

  async addMenu(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessException(400, '菜单编码已存在');
    const newMenu = await this.prisma.menu.create({ data: dto });
    this.logger.info({ menuId: newMenu.id, code: newMenu.code }, 'Menu created');
    return newMenu;
  }

  async updateMenu(dto: UpdateMenuDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(400, '缺少菜单ID');
    const updated = await this.prisma.menu.update({ where: { id }, data });
    this.logger.info({ menuId: id }, 'Menu updated');
    return updated;
  }

  async delMenu(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!menu) throw new BusinessException(400, '菜单不存在');
    if (menu.children.length > 0) {
      throw new BusinessException(400, '请先删除子菜单');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { menuId: id } });
      await tx.menu.delete({ where: { id } });
    });
    this.logger.info({ menuId: id }, 'Menu deleted');
    return { message: '删除成功' };
  }

  private buildTree(menus: MenuTreeNode[]): MenuTreeNode[] {
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

    return roots;
  }
}
