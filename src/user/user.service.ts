import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcryptjs';
import { BusinessException } from '../common/exceptions/business.exception';
import { HttpStatus, EntityStatus, CONFIG_DEFAULTS } from '../constant';
import { ListResult } from '../common/response';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
    private readonly i18n: I18nService,
  ) {
    this.logger.setContext(UserService.name);
  }

  async getUserList(
    page: number = CONFIG_DEFAULTS.DEFAULT_PAGE,
    pageSize: number = CONFIG_DEFAULTS.DEFAULT_PAGE_SIZE,
  ) {
    const skip = (page - 1) * pageSize;
    const where = { deletedAt: null };
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        where,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return new ListResult(list, total, page, pageSize);
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: { role: true },
        },
      },
    });
    if (!user) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'user.not_found');
    }
    return user;
  }

  async addUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (existing) {
      throw new BusinessException(HttpStatus.BAD_REQUEST, 'user.username_exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, CONFIG_DEFAULTS.BCRYPT_SALT_ROUNDS);
    const newUser = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        email: dto.email,
        phone: dto.phone,
      },
      select: { id: true, username: true, email: true, phone: true },
    });
    this.logger.info({ userId: newUser.id, username: newUser.username }, 'User created');
    return newUser;
  }

  async updateUser(dto: UpdateUserDto & { id?: number }) {
    const { id, password, ...rest } = dto;
    if (!id) throw new BusinessException(HttpStatus.BAD_REQUEST, 'user.missing_id');

    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new BusinessException(HttpStatus.BAD_REQUEST, 'user.not_found');

    if (rest.username && rest.username !== user.username) {
      const existing = await this.prisma.user.findFirst({
        where: { username: rest.username, deletedAt: null },
      });
      if (existing) throw new BusinessException(HttpStatus.BAD_REQUEST, 'user.username_exists');
    }

    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, CONFIG_DEFAULTS.BCRYPT_SALT_ROUNDS);
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, phone: true, status: true },
    });
    this.logger.info({ userId: id }, 'User updated');
    return updated;
  }

  async delUser(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new BusinessException(HttpStatus.BAD_REQUEST, 'user.not_found');

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: EntityStatus.DISABLED, email: null },
    });
    this.logger.info({ userId: id }, 'User soft-deleted');
    return { message: this.i18n.t('user.delete_success') };
  }

  async assignRoles(userId: number, dto: AssignRolesDto) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new BusinessException(HttpStatus.BAD_REQUEST, 'user.not_found');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId, roleId })),
        });
      }
    });
    this.logger.info({ userId, roleIds: dto.roleIds }, 'Roles assigned');
    return { message: this.i18n.t('user.assign_role_success') };
  }
}
