import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as svgCaptcha from 'svg-captcha';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { AppSession } from '../common/types';
import { BusinessException } from '../common/exceptions/business.exception';
import * as code from '../common/code';

/**
 * 认证服务
 * 负责验证码生成、用户登录/登出、用户信息获取等认证相关功能
 */
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  /**
   * 生成 SVG 格式的图形验证码
   * 将验证码文本（小写）存入 session，返回 SVG 字符串给前端渲染
   * @param session - 当前请求的 session 对象
   * @returns SVG 格式的验证码图片字符串
   */
  generateCaptcha(session: AppSession): string {
    // 创建图形验证码：4 位字符、2 条干扰线、彩色
    const captcha = svgCaptcha.create({
      size: 4,
      noise: 2,
      color: true,
    });
    // 将验证码文本转为小写后存入 session，供后续登录校验使用
    session.captcha = captcha.text.toLowerCase();
    return captcha.data;
  }

  /**
   * 用户登录
   * 先校验验证码，再校验用户名和密码，全部通过后将 userId 写入 session
   * @param dto - 登录请求数据（用户名、密码、验证码）
   * @param session - 当前请求的 session 对象
   * @returns 登录成功的用户信息（userId 和 username）
   * @throws BadRequestException 验证码未获取/错误，或用户名密码错误
   */
  async login(dto: LoginDto, session: AppSession): Promise<{ userId: number; username: string }> {
    // 检查 session 中是否存在验证码，不存在则说明未请求验证码
    if (!session.captcha) {
      throw new BusinessException(400, code.CAPTCHA_REQUIRED, '请先获取验证码');
    }
    // 比对用户输入的验证码（忽略大小写）
    if (dto.captcha.toLowerCase() !== session.captcha) {
      throw new BusinessException(400, code.CAPTCHA_ERROR, '验证码错误');
    }
    // 验证码使用后立即清除，防止重复使用
    delete session.captcha;

    // 根据用户名查询用户
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    // 用户不存在或状态非启用（status !== 1）时返回模糊的错误信息，避免信息泄露
    if (!user || user.status !== 1) {
      throw new BusinessException(400, code.LOGIN_FAILED, '用户名或密码错误');
    }

    // 使用 bcrypt 比对明文密码与数据库中的哈希值
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new BusinessException(400, code.LOGIN_FAILED, '用户名或密码错误');
    }

    // 登录成功后将用户 ID 写入 session
    session.userId = user.id;
    return { userId: user.id, username: user.username };
  }

  /**
   * 用户登出
   * 销毁当前 session，清除所有 session 数据
   * @param session - 当前请求的 session 对象
   */
  logout(session: AppSession): void {
    session.destroy(() => {});
  }

  /**
   * 获取当前登录用户的详细信息及其权限菜单
   * 通过用户-角色-菜单的关联关系，收集所有启用的菜单并构建为树形结构
   * @param userId - 用户 ID
   * @returns 用户信息及树形菜单数组，用户不存在时返回 null
   */
  async getUserInfo(userId: number) {
    // 查询用户及其关联的角色和菜单（嵌套加载 role -> roleMenus -> menu）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                roleMenus: {
                  include: { menu: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // 使用 Map 对来自多个角色的菜单进行去重合并
    const menuMap = new Map<number, any>();
    for (const ur of user.userRoles) {
      // 跳过已禁用的角色
      if (ur.role.status !== 1) continue;
      for (const rm of ur.role.roleMenus) {
        // 跳过已禁用的菜单
        if (rm.menu.status !== 1) continue;
        // 以菜单 ID 为键，首个遇到的菜单保留，后续重复的跳过
        if (!menuMap.has(rm.menu.id)) {
          menuMap.set(rm.menu.id, {
            id: rm.menu.id,
            name: rm.menu.name,
            code: rm.menu.code,
            parentId: rm.menu.parentId,
            path: rm.menu.path,
            icon: rm.menu.icon,
            sortOrder: rm.menu.sortOrder,
            children: [],
          });
        }
      }
    }

    // 将去重后的平铺菜单列表构建为树形结构
    const menus = this.buildMenuTree(Array.from(menuMap.values()));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      menus,
    };
  }

  /**
   * 构建菜单树
   * 将平铺的菜单列表按 parentId 组装为多级树形结构，并按 sortOrder 排序
   * @param menus - 平铺的菜单数组
   * @returns 排序后的菜单树（仅包含根节点）
   */
  private buildMenuTree(menus: any[]): any[] {
    const map = new Map<number, any>();
    const roots: any[] = [];

    // 将所有菜单放入 Map，并为每个菜单初始化 children 数组
    for (const menu of menus) {
      map.set(menu.id, { ...menu, children: [] });
    }

    // 遍历 Map，将每个菜单挂到其父节点的 children 中；
    // 无 parentId 或父节点不在当前集合中时视为根节点
    for (const menu of map.values()) {
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId).children.push(menu);
      } else {
        roots.push(menu);
      }
    }

    // 根节点按 sortOrder 升序排列
    roots.sort((a, b) => a.sortOrder - b.sortOrder);
    // 递归对每个子树内部也进行排序
    for (const root of roots) {
      this.sortChildren(root);
    }

    return roots;
  }

  /**
   * 递归排序子菜单
   * 按 sortOrder 对当前节点的所有子节点排序，并逐级向下递归
   * @param node - 当前菜单节点
   */
  private sortChildren(node: any): void {
    node.children.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    for (const child of node.children) {
      this.sortChildren(child);
    }
  }
}
