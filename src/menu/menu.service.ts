import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async getMenuTree() {
    const menus = await this.prisma.menu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  async getMenuById(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BadRequestException('菜单不存在');
    return menu;
  }

  async addMenu(dto: CreateMenuDto) {
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException('菜单编码已存在');
    return this.prisma.menu.create({ data: dto });
  }

  async updateMenu(dto: UpdateMenuDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BadRequestException('缺少菜单ID');
    return this.prisma.menu.update({ where: { id }, data });
  }

  async delMenu(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!menu) throw new BadRequestException('菜单不存在');
    if (menu.children.length > 0) {
      throw new BadRequestException('请先删除子菜单');
    }
    await this.prisma.roleMenu.deleteMany({ where: { menuId: id } });
    await this.prisma.menu.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private buildTree(menus: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId)!.children.push(menu);
      } else {
        roots.push(menu);
      }
    }

    return roots;
  }
}
