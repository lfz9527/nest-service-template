import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcryptjs';
import { BusinessException } from '../common/exceptions/business.exception';
import { ListResult } from '../common/response';
import { PinoLogger } from 'nestjs-pino';

/**
 * 用户管理服务
 * 提供用户的增删改查、分页查询、角色分配等业务逻辑
 */
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UserService.name);
  }

  async getUserList(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
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
      this.prisma.user.count(),
    ]);
    return new ListResult(list, total, page, pageSize);
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
      throw new BusinessException(400, '用户不存在');
    }
    return user;
  }

  async addUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new BusinessException(400, '用户名已存在');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
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
    if (!id) throw new BusinessException(400, '缺少用户ID');

    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BusinessException(400, '用户不存在');

    // 如果修改了用户名，检查新用户名是否已被其他用户占用
    if (rest.username && rest.username !== user.username) {
      const existing = await this.prisma.user.findUnique({ where: { username: rest.username } });
      if (existing) throw new BusinessException(400, '用户名已存在');
    }

    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
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
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BusinessException(400, '用户不存在');
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
    this.logger.info({ userId: id }, 'User deleted');
    return { message: '删除成功' };
  }

  async assignRoles(userId: number, dto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BusinessException(400, '用户不存在');

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId, roleId })),
        });
      }
    });
    this.logger.info({ userId, roleIds: dto.roleIds }, 'Roles assigned');
    return { message: '分配成功' };
  }
}
