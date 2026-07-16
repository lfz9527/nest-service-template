import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { MenuService } from '../../src/menu/menu.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from 'nestjs-i18n';
import { BusinessException } from '../../src/common/exceptions/business.exception';

describe('MenuService (unit)', () => {
  let service: MenuService;
  let prisma: MockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const logger = mockDeep<PinoLogger>();
    const i18n = mockDeep<I18nService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: prisma },
        { provide: PinoLogger, useValue: logger },
        { provide: I18nService, useValue: i18n },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  describe('getMenuTree', () => {
    it('should return empty array when no menus', async () => {
      prisma.menu.findMany.mockResolvedValue([]);

      const result = await service.getMenuTree();

      expect(result).toEqual([]);
    });

    it('should build flat menus into tree structure', async () => {
      const flat = [
        { id: 1, parentId: null, sortOrder: 1, name: 'root', code: 'root' },
        { id: 2, parentId: 1, sortOrder: 1, name: 'child', code: 'child' },
      ] as any[];
      prisma.menu.findMany.mockResolvedValue(flat);

      const result = await service.getMenuTree();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children?.[0].id).toBe(2);
    });

    it('should sort by sortOrder', async () => {
      const flat = [
        { id: 2, parentId: null, sortOrder: 2, name: 'B' },
        { id: 1, parentId: null, sortOrder: 1, name: 'A' },
      ] as any[];
      prisma.menu.findMany.mockResolvedValue(flat);

      const result = await service.getMenuTree();

      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  describe('getMenuById', () => {
    it('should return menu when found', async () => {
      prisma.menu.findUnique.mockResolvedValue({ id: 1, name: 'x' } as any);

      const result = await service.getMenuById(1);

      expect(result).toHaveProperty('id', 1);
    });

    it('should throw when menu not found', async () => {
      prisma.menu.findUnique.mockResolvedValue(null);

      await expect(service.getMenuById(999)).rejects.toThrow(BusinessException);
    });
  });

  describe('addMenu', () => {
    it('should throw when code already exists', async () => {
      prisma.menu.findUnique.mockResolvedValue({ id: 1 } as any);

      await expect(
        service.addMenu({
          name: 'x',
          code: 'dup',
          parentId: null,
          path: null,
          icon: null,
          sortOrder: 1,
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('should create menu when code is unique', async () => {
      prisma.menu.findUnique.mockResolvedValue(null);
      prisma.menu.create.mockResolvedValue({ id: 1, name: 'x', code: 'x' } as any);

      const result = await service.addMenu({
        name: 'x',
        code: 'x',
        parentId: null,
        path: null,
        icon: null,
        sortOrder: 1,
      });

      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('updateMenu', () => {
    it('should throw when id is missing', async () => {
      await expect(service.updateMenu({ name: 'x' } as any)).rejects.toThrow(BusinessException);
    });

    it('should throw when menu not found', async () => {
      prisma.menu.findUnique.mockResolvedValue(null);

      await expect(service.updateMenu({ id: 1, name: 'x' })).rejects.toThrow(BusinessException);
    });

    it('should throw when new code conflicts with another menu', async () => {
      prisma.menu.findUnique
        .mockResolvedValueOnce({ id: 1, code: 'old' } as any)
        .mockResolvedValueOnce({ id: 2 } as any);

      await expect(service.updateMenu({ id: 1, code: 'taken' })).rejects.toThrow(BusinessException);
    });

    it('should update menu successfully', async () => {
      prisma.menu.findUnique
        .mockResolvedValueOnce({ id: 1, code: 'old' } as any)
        .mockResolvedValueOnce(null);
      prisma.menu.update.mockResolvedValue({ id: 1, code: 'new' } as any);

      const result = await service.updateMenu({ id: 1, code: 'new' });

      expect(result).toHaveProperty('id', 1);
    });
  });

  describe('delMenu', () => {
    it('should throw when menu not found', async () => {
      prisma.menu.findUnique.mockResolvedValue(null);

      await expect(service.delMenu(999)).rejects.toThrow(BusinessException);
    });

    it('should throw when menu has children', async () => {
      prisma.menu.findUnique.mockResolvedValue({ id: 1, children: [{ id: 2 }] } as any);

      await expect(service.delMenu(1)).rejects.toThrow(BusinessException);
    });

    it('should delete menu with transaction', async () => {
      prisma.menu.findUnique.mockResolvedValue({ id: 1, children: [] } as any);
      const tx = mockDeep<any>();
      tx.roleMenu.deleteMany.mockResolvedValue({});
      tx.menu.delete.mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

      const result = await service.delMenu(1);

      expect(tx.roleMenu.deleteMany).toHaveBeenCalledWith({ where: { menuId: 1 } });
      expect(tx.menu.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toHaveProperty('message');
    });
  });
});
