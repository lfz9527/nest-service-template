import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import * as bcrypt from 'bcryptjs';

/**
 * 用户管理服务
 * 提供用户的增删改查、分页查询、角色分配等业务逻辑
 */
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * 分页查询用户列表
   * 排除 passwordHash 敏感字段，仅返回基础信息
   * @param page - 页码，默认 1
   * @param pageSize - 每页条数，默认 10
   * @returns 包含列表、总数、页码和每页条数的分页结果
   */
  async getUserList(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    // 并发执行数据查询和总数统计，减少等待时间
    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        // 显式 select 避免返回 passwordHash 等敏感字段
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
    return { list, total, page, pageSize };
  }

  /**
   * 根据 ID 获取单个用户详情
   * 同时加载该用户关联的角色信息
   * @param id - 用户 ID
   * @throws BadRequestException 用户不存在时抛出
   * @returns 用户详情及关联角色
   */
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
        // 同时加载用户关联的角色（包含角色详情）
        userRoles: {
          include: { role: true },
        },
      },
    });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    return user;
  }

  /**
   * 新增用户
   * 先检查用户名是否已存在，再对密码进行 bcrypt 哈希后入库
   * @param dto - 创建用户请求数据
   * @throws BadRequestException 用户名已存在时抛出
   * @returns 新建用户的基础信息（不含密码）
   */
  async addUser(dto: CreateUserDto) {
    // 校验用户名唯一性
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new BadRequestException('用户名已存在');
    }
    // 使用 bcrypt 对明文密码进行哈希（10 轮盐值迭代）
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        email: dto.email,
        phone: dto.phone,
      },
      select: { id: true, username: true, email: true, phone: true },
    });
  }

  /**
   * 更新用户信息
   * 仅更新提供的字段；若 password 非空则一并重哈希密码
   * @param dto - 更新用户请求数据（可附带 id）
   * @throws BadRequestException 缺少 id 时抛出
   * @returns 更新后的用户基础信息
   */
  async updateUser(dto: UpdateUserDto & { id?: number }) {
    const { id, password, ...rest } = dto;
    if (!id) throw new BadRequestException('缺少用户ID');

    const data: any = { ...rest };
    // 如果有新密码，对其做 bcrypt 哈希后再更新
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, phone: true, status: true },
    });
  }

  /**
   * 删除用户
   * 先检查用户是否存在，然后级联删除关联的角色记录，最后删除用户本身
   * @param id - 用户 ID
   * @throws BadRequestException 用户不存在时抛出
   */
  async delUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new BadRequestException('用户不存在');
    // 先删除关联表记录，再删除主表记录，避免外键约束冲突
    await this.prisma.userRole.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { message: '删除成功' };
  }

  /**
   * 为用户分配角色
   * 采用全量覆盖方式：先删除用户所有现有角色，再批量插入新角色
   * @param userId - 用户 ID
   * @param dto - 角色 ID 列表
   * @throws BadRequestException 用户不存在时抛出
   */
  async assignRoles(userId: number, dto: AssignRolesDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('用户不存在');

    // 全量覆盖：删除旧角色记录
    await this.prisma.userRole.deleteMany({ where: { userId } });
    // 如果新角色列表非空，则批量插入
    if (dto.roleIds.length > 0) {
      await this.prisma.userRole.createMany({
        data: dto.roleIds.map(roleId => ({ userId, roleId })),
      });
    }
    return { message: '分配成功' };
  }
}
