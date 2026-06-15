import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { BusinessException } from '../common/exceptions/business.exception';
import * as code from '../common/code';

/**
 * 菜单服务层
 * 封装菜单相关的核心业务逻辑，包括菜单的增删改查以及树形结构构建
 */
@Injectable()
export class MenuService {
  /** 注入 PrismaService 用于数据库操作 */
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜单树
   * 按 sortOrder 升序查询所有菜单，然后递归构建为树形结构
   */
  async getMenuTree() {
    const menus = await this.prisma.menu.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return this.buildTree(menus);
  }

  /**
   * 根据 ID 获取单个菜单
   * 若菜单不存在则抛出 BadRequestException
   * @param id 菜单 ID
   */
  async getMenuById(id: number) {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new BusinessException(400, code.MENU_NOT_FOUND, '菜单不存在');
    return menu;
  }

  /**
   * 新增菜单
   * 创建前检查菜单编码是否已存在，防止重复
   * @param dto 创建菜单的请求数据
   */
  async addMenu(dto: CreateMenuDto) {
    // 检查菜单编码是否已被使用
    const existing = await this.prisma.menu.findUnique({ where: { code: dto.code } });
    if (existing) throw new BusinessException(400, code.MENU_CODE_EXISTS, '菜单编码已存在');
    return this.prisma.menu.create({ data: dto });
  }

  /**
   * 更新菜单信息
   * 从 dto 中提取 id，剩余字段作为更新数据
   * @param dto 包含 id 和待更新字段的复合对象
   */
  async updateMenu(dto: UpdateMenuDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(400, code.BAD_REQUEST, '缺少菜单ID');
    return this.prisma.menu.update({ where: { id }, data });
  }

  /**
   * 删除菜单
   * 先检查是否存在子菜单，若有子菜单则禁止删除（防止数据不一致）
   * 同时级联删除角色-菜单关联表中的相关记录
   * @param id 菜单 ID
   */
  async delMenu(id: number) {
    // 查询菜单及其子菜单
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!menu) throw new BusinessException(400, code.MENU_NOT_FOUND, '菜单不存在');
    // 如果有子菜单则不允许删除，需先删除子菜单
    if (menu.children.length > 0) {
      throw new BusinessException(400, code.MENU_HAS_CHILDREN, '请先删除子菜单');
    }
    // 事务保证删除原子性：关联记录与菜单同时删除
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { menuId: id } });
      await tx.menu.delete({ where: { id } });
    });
    return { message: '删除成功' };
  }

  /**
   * 将扁平菜单列表构建为树形结构
   * 通过 Map 建立 id 到菜单对象的映射，利用 parentId 关联父子关系
   * @param menus 扁平菜单列表
   * @returns 树形菜单数组（仅包含根节点）
   */
  private buildTree(menus: any[]): any[] {
    // 使用 Map 暂存所有菜单节点，便于通过 id 快速查找
    const map = new Map<number, any>();
    const roots: any[] = [];

    // 第一遍遍历：将所有菜单放入 Map，并初始化 children 数组
    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    // 第二遍遍历：根据 parentId 将节点挂到对应父节点的 children 下
    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        // 存在有效父节点，将当前节点添加到父节点的 children 中
        map.get(menu.parentId)!.children.push(menu);
      } else {
        // 没有父节点或父节点不存在，作为根节点
        roots.push(menu);
      }
    }

    return roots;
  }
}
