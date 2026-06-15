import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

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
    if (!role) throw new BadRequestException('角色不存在');
    return role;
  }

  async addRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new BadRequestException('角色名或编码已存在');
    return this.prisma.role.create({ data: dto });
  }

  async updateRole(dto: UpdateRoleDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BadRequestException('缺少角色ID');
    return this.prisma.role.update({ where: { id }, data });
  }

  async delRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BadRequestException('角色不存在');
    await this.prisma.roleMenu.deleteMany({ where: { roleId: id } });
    await this.prisma.userRole.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    return { message: '删除成功' };
  }

  async assignMenus(roleId: number, dto: AssignMenusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('角色不存在');
    await this.prisma.roleMenu.deleteMany({ where: { roleId } });
    if (dto.menuIds.length > 0) {
      await this.prisma.roleMenu.createMany({
        data: dto.menuIds.map(menuId => ({ roleId, menuId })),
      });
    }
    return { message: '分配成功' };
  }
}
