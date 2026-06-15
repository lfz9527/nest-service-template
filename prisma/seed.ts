import { PrismaClient } from '../src/generated/prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      email: 'admin@example.com',
      status: 1,
    },
  });
  console.log('Admin user:', adminUser.username);

  const adminRole = await prisma.role.upsert({
    where: { code: 'admin' },
    update: {},
    create: {
      name: '超级管理员',
      code: 'admin',
      description: '拥有所有权限',
      status: 1,
    },
  });
  console.log('Admin role:', adminRole.name);

  const menuData = [
    { name: '系统管理', code: 'system', path: '/system', icon: 'setting', sortOrder: 1 },
    { name: '用户管理', code: 'user:list', path: '/system/user', icon: 'user', sortOrder: 1, parentCode: 'system' },
    { name: '角色管理', code: 'role:list', path: '/system/role', icon: 'team', sortOrder: 2, parentCode: 'system' },
    { name: '菜单管理', code: 'menu:list', path: '/system/menu', icon: 'menu', sortOrder: 3, parentCode: 'system' },
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
        status: 1,
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

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log('Assigned admin role to admin user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
