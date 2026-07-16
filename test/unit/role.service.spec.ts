import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { RoleService } from '../../src/role/role.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from 'nestjs-i18n';
import { BusinessException } from '../../src/common/exceptions/business.exception';

describe('RoleService (unit)', () => {
  let service: RoleService;
  let prisma: MockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const logger = mockDeep<PinoLogger>();
    const i18n = mockDeep<I18nService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: PrismaService, useValue: prisma },
        { provide: PinoLogger, useValue: logger },
        { provide: I18nService, useValue: i18n },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  describe('getRoleList', () => {
    it('should return all roles with roleMenus and _count', async () => {
      const mockRoles = [{ id: 1, name: 'admin', roleMenus: [], _count: { userRoles: 2 } }];
      prisma.role.findMany.mockResolvedValue(mockRoles as any);

      const result = await service.getRoleList();

      expect(result).toEqual(mockRoles);
    });
  });

  describe('getRoleById', () => {
    it('should return role with includes when found', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 1, roleMenus: [] } as any);

      const result = await service.getRoleById(1);

      expect(result).toHaveProperty('id', 1);
    });

    it('should throw when role not found', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.getRoleById(999)).rejects.toThrow(BusinessException);
    });
  });

  describe('addRole', () => {
    it('should throw when name or code already exists', async () => {
      prisma.role.findFirst.mockResolvedValue({ id: 1 } as any);

      await expect(service.addRole({ name: 'admin', code: 'admin' })).rejects.toThrow(
        BusinessException,
      );
    });

    it('should create role when unique', async () => {
      prisma.role.findFirst.mockResolvedValue(null);
      prisma.role.create.mockResolvedValue({ id: 1, name: 'test', code: 'test' } as any);

      const result = await service.addRole({ name: 'test', code: 'test' });

      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('updateRole', () => {
    it('should throw when id is missing', async () => {
      await expect(service.updateRole({ name: 'x' } as any)).rejects.toThrow(BusinessException);
    });

    it('should throw when role not found', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.updateRole({ id: 1, name: 'x' })).rejects.toThrow(BusinessException);
    });

    it('should update role successfully', async () => {
      prisma.role.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'old', code: 'old' } as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.role.update.mockResolvedValue({ id: 1, name: 'new' } as any);

      const result = await service.updateRole({ id: 1, name: 'new' });

      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('delRole', () => {
    it('should throw when role not found', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.delRole(999)).rejects.toThrow(BusinessException);
    });

    it('should delete role with transaction cleanup', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 1 } as any);
      const tx = mockDeep<any>();
      tx.roleMenu.deleteMany.mockResolvedValue({});
      tx.userRole.deleteMany.mockResolvedValue({});
      tx.role.delete.mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

      const result = await service.delRole(1);

      expect(tx.roleMenu.deleteMany).toHaveBeenCalledWith({ where: { roleId: 1 } });
      expect(tx.userRole.deleteMany).toHaveBeenCalledWith({ where: { roleId: 1 } });
      expect(tx.role.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toHaveProperty('message');
    });
  });

  describe('assignMenus', () => {
    it('should throw when role not found', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.assignMenus(999, { menuIds: [1] })).rejects.toThrow(BusinessException);
    });

    it('should clear menus and assign new ones', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 1 } as any);
      const tx = mockDeep<any>();
      tx.roleMenu.deleteMany.mockResolvedValue({});
      tx.roleMenu.createMany.mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

      await service.assignMenus(1, { menuIds: [1, 2] });

      expect(tx.roleMenu.deleteMany).toHaveBeenCalledWith({ where: { roleId: 1 } });
      expect(tx.roleMenu.createMany).toHaveBeenCalled();
    });

    it('should not createMany when empty menuIds', async () => {
      prisma.role.findUnique.mockResolvedValue({ id: 1 } as any);
      const tx = mockDeep<any>();
      tx.roleMenu.deleteMany.mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

      await service.assignMenus(1, { menuIds: [] });

      expect(tx.roleMenu.createMany).not.toHaveBeenCalled();
    });
  });
});
