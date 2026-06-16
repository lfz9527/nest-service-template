import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { PinoLogger } from 'nestjs-pino';

/**
 * 角色服务层
 * 封装角色相关的核心业务逻辑，包括角色的增删改查以及菜单分配
 */
@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RoleService.name);
  }

  async getRoleList() {
    return this.prisma.role.findMany({
      include: {
        roleMenus: { include: { menu: true } },
        _count: { select: { userRoles: true } },
      },
    });
  }

  async getRoleById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        roleMenus: { include: { menu: true } },
        _count: { select: { userRoles: true } },
      },
    });
    if (!role) throw new BusinessException(400, '角色不存在');
    return role;
  }

  async addRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new BusinessException(400, '角色名或编码已存在');
    const newRole = await this.prisma.role.create({ data: dto });
    this.logger.info({ roleId: newRole.id, name: newRole.name }, 'Role created');
    return newRole;
  }

  async updateRole(dto: UpdateRoleDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(400, '缺少角色ID');
    const updated = await this.prisma.role.update({ where: { id }, data });
    this.logger.info({ roleId: id }, 'Role updated');
    return updated;
  }

  async delRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BusinessException(400, '角色不存在');
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
    this.logger.info({ roleId: id }, 'Role deleted');
    return { message: '删除成功' };
  }

  async assignMenus(roleId: number, dto: AssignMenusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BusinessException(400, '角色不存在');
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (dto.menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: dto.menuIds.map(menuId => ({ roleId, menuId })),
        });
      }
    });
    this.logger.info({ roleId, menuIds: dto.menuIds }, 'Menus assigned to role');
    return { message: '分配成功' };
  }
}
