import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import * as code from '../common/code';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';

/**
 * 角色服务层
 * 封装角色相关的核心业务逻辑，包括角色的增删改查以及菜单分配
 */
@Injectable()
export class RoleService {
  /** 注入 PrismaService 用于数据库操作 */
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有角色列表
   * 同时返回每个角色关联的菜单信息和用户数量
   */
  async getRoleList() {
    return this.prisma.role.findMany({
      include: {
        roleMenus: { include: { menu: true } }, // 关联查询角色-菜单中间表及菜单详情
        _count: { select: { userRoles: true } }, // 统计关联的用户数量
      },
    });
  }

  /**
   * 根据 ID 获取单个角色详情
   * 若角色不存在则抛出 BadRequestException
   * @param id 角色 ID
   */
  async getRoleById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        roleMenus: { include: { menu: true } },
        _count: { select: { userRoles: true } },
      },
    });
    if (!role) throw new BusinessException(400, code.ROLE_NOT_FOUND, '角色不存在');
    return role;
  }

  /**
   * 新增角色
   * 创建前检查角色名和编码是否已存在，防止重复
   * @param dto 创建角色的请求数据
   */
  async addRole(dto: CreateRoleDto) {
    // 检查角色名或编码是否已存在
    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new BusinessException(400, code.ROLE_EXISTS, '角色名或编码已存在');
    return this.prisma.role.create({ data: dto });
  }

  /**
   * 更新角色信息
   * 从 dto 中提取 id，剩余字段作为更新数据
   * @param dto 包含 id 和待更新字段的复合对象
   */
  async updateRole(dto: UpdateRoleDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(400, code.BAD_REQUEST, '缺少角色ID');
    return this.prisma.role.update({ where: { id }, data });
  }

  /**
   * 删除角色
   * 先删除角色关联的菜单中间表和用户-角色中间表，再删除角色本身
   * @param id 角色 ID
   */
  async delRole(id: number) {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BusinessException(400, code.ROLE_NOT_FOUND, '角色不存在');
    // 事务保证删除原子性：关联记录与角色同时删除
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
    return { message: '删除成功' };
  }

  /**
   * 为角色分配菜单权限
   * 先清空原有关联，再插入新的菜单关联记录（全量替换策略）
   * @param roleId 角色 ID
   * @param dto 包含菜单 ID 列表的请求数据
   */
  async assignMenus(roleId: number, dto: AssignMenusDto) {
    // 验证角色是否存在
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BusinessException(400, code.ROLE_NOT_FOUND, '角色不存在');
    // 事务保证全量覆盖原子性：删除旧菜单关联和插入新菜单关联是一个整体
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (dto.menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: dto.menuIds.map(menuId => ({ roleId, menuId })),
        });
      }
    });
    return { message: '分配成功' };
  }
}
