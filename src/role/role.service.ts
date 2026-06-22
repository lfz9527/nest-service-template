import { Injectable } from '@nestjs/common';
import { BusinessException } from '../common/exceptions/business.exception';
import { HttpStatus } from '../constant';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignMenusDto } from './dto/assign-menus.dto';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
    private i18n: I18nService,
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
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, 'role.not_found');
    return role;
  }

  async addRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing)
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'role.name_or_code_exists');
    const newRole = await this.prisma.role.create({ data: dto });
    this.logger.info({ roleId: newRole.id, name: newRole.name }, 'Role created');
    return newRole;
  }

  async updateRole(dto: UpdateRoleDto & { id?: number }) {
    const { id, ...data } = dto;
    if (!id) throw new BusinessException(HttpStatus.BAD_REQUEST, 'role.missing_id');

    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, 'role.not_found');

    const conflicts: string[] = [];
    if (data.name && data.name !== role.name) {
      const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
      if (existing) conflicts.push(this.i18n.t('role.role_name'));
    }
    if (data.code && data.code !== role.code) {
      const existing = await this.prisma.role.findUnique({ where: { code: data.code } });
      if (existing) conflicts.push(this.i18n.t('role.role_code'));
    }
    if (conflicts.length > 0) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'role.update_conflict_exists', {
        args: { fields: conflicts.join('、') },
      });
    }

    const updated = await this.prisma.role.update({ where: { id }, data });
    this.logger.info({ roleId: id }, 'Role updated');
    return updated;
  }

  async delRole(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, 'role.not_found');
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      await tx.userRole.deleteMany({ where: { roleId: id } });
      await tx.role.delete({ where: { id } });
    });
    this.logger.info({ roleId: id }, 'Role deleted');
    return { message: this.i18n.t('role.delete_success') };
  }

  async assignMenus(roleId: number, dto: AssignMenusDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BusinessException(HttpStatus.BAD_REQUEST, 'role.not_found');
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId } });
      if (dto.menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: dto.menuIds.map((menuId) => ({ roleId, menuId })),
        });
      }
    });
    this.logger.info({ roleId, menuIds: dto.menuIds }, 'Menus assigned to role');
    return { message: this.i18n.t('role.assign_menu_success') };
  }
}
