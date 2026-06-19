import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { EntityStatus } from '../src/common/code';
import { CONFIG_DEFAULTS } from '../src/common/config.defaults';
import { PERM } from '../src/common/permissions';
import { SUPER_ADMIN, USER } from '../src/common/role-code';

// 加载对应环境的配置文件
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

async function main() {
  const passwordHash = await bcrypt.hash('admin123', CONFIG_DEFAULTS.BCRYPT_SALT_ROUNDS);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      email: 'admin@example.com',
      status: EntityStatus.ENABLED,
    },
  });
  console.log('Admin user:', adminUser.username);

  const adminRole = await prisma.role.upsert({
    where: { code: SUPER_ADMIN },
    update: {},
    create: {
      name: '超级管理员',
      code: SUPER_ADMIN,
      description: '拥有所有权限',
      status: EntityStatus.ENABLED,
    },
  });
  console.log('Admin role:', adminRole.name);

  const menuData = [
    { name: '系统管理', code: 'system', path: '/system', icon: 'setting', sortOrder: 1 },
    { name: '用户管理', code: PERM.USER.LIST, path: '/system/user', icon: 'user', sortOrder: 1, parentCode: 'system' },
    { name: '角色管理', code: PERM.ROLE.LIST, path: '/system/role', icon: 'team', sortOrder: 2, parentCode: 'system' },
    { name: '菜单管理', code: PERM.MENU.LIST, path: '/system/menu', icon: 'menu', sortOrder: 3, parentCode: 'system' },
  ];

  const menuMap = new Map<string, number>();

  for (const item of menuData) {
    const { parentCode, ...data } = item;
    const parentId = parentCode ? menuMap.get(parentCode) : null;
    const menu = await prisma.menu.upsert({
      where: { code: data.code },
      update: {},
      create: {
        name: data.name,
        code: data.code,
        path: data.path,
        icon: data.icon,
        sortOrder: data.sortOrder,
        parentId: parentId ?? null,
        status: EntityStatus.ENABLED,
      },
    });
    menuMap.set(menu.code, menu.id);
    console.log('Menu:', menu.name, '(parentId:', menu.parentId, ')');
  }

  const allMenuIds = Array.from(menuMap.values());
  for (const menuId of allMenuIds) {
    await prisma.roleMenu.upsert({
      where: { roleId_menuId: { roleId: adminRole.id, menuId } },
      update: {},
      create: { roleId: adminRole.id, menuId },
    });
  }
  console.log('Assigned all menus to admin role');

  // 创建普通用户角色
  const userRole = await prisma.role.upsert({
    where: { code: USER },
    update: {},
    create: {
      name: '普通用户',
      code: USER,
      description: '基础用户权限',
      status: EntityStatus.ENABLED,
    },
  });
  console.log('User role:', userRole.name);

  // 创建普通用户
  const regularUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      passwordHash: await bcrypt.hash('user123', CONFIG_DEFAULTS.BCRYPT_SALT_ROUNDS),
      email: 'user@example.com',
      status: EntityStatus.ENABLED,
    },
  });
  console.log('Regular user:', regularUser.username);

  // 分配角色
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log('Assigned admin role to admin user');

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: regularUser.id, roleId: userRole.id } },
    update: {},
    create: { userId: regularUser.id, roleId: userRole.id },
  });
  console.log('Assigned user role to regular user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
