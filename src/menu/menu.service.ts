import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { BusinessException } from '../common/business.exception';
import { HttpStatus } from '../constant';
import { MenuTreeNode } from '../common/types';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
    private i18n: I18nService,
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
    if (!menu) throw new BusinessException(HttpStatus.BAD_REQUEST, 'menu.not_found');
    return menu;
  }

  async addMenu(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessException(HttpStatus.BAD_REQUEST, 'menu.code_exists');
    const newMenu = await this.prisma.menu.create({ data: dto });
    this.logger.info({ menuId: newMenu.id, code: newMenu.code }, 'Menu created');
    return newMenu;
  }

  async updateMenu(dto: UpdateMenuDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(HttpStatus.BAD_REQUEST, 'menu.missing_id');

    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BusinessException(HttpStatus.BAD_REQUEST, 'menu.not_found');

    if (data.code && data.code !== menu.code) {
      const existing = await this.prisma.menu.findUnique({ where: { code: data.code } });
      if (existing) throw new BusinessException(HttpStatus.BAD_REQUEST, 'menu.code_exists');
    }

    const updated = await this.prisma.menu.update({ where: { id }, data });
    this.logger.info({ menuId: id }, 'Menu updated');
    return updated;
  }

  async delMenu(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!menu) throw new BusinessException(HttpStatus.BAD_REQUEST, 'menu.not_found');
    if (menu.children.length > 0) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'menu.has_children');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { menuId: id } });
      await tx.menu.delete({ where: { id } });
    });
    this.logger.info({ menuId: id }, 'Menu deleted');
    return { message: this.i18n.t('menu.delete_success') };
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

    const sort = (nodes: MenuTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          sort(node.children);
        }
      }
    };
    sort(roots);

    return roots;
  }
}
