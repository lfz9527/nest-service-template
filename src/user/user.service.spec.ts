import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from 'nestjs-i18n';
import { BusinessException } from '../common/exceptions/business.exception';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UserService (unit)', () => {
  let service: UserService;
  let prisma: MockProxy<PrismaService>;
  let i18n: MockProxy<I18nService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const logger = mockDeep<PinoLogger>();
    i18n = mockDeep<I18nService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: PinoLogger, useValue: logger },
        { provide: I18nService, useValue: i18n },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('getUserList', () => {
    it('should return ListResult with default pagination', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await service.getUserList();

      expect(result.list).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should calculate skip from custom page/pageSize', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.getUserList(3, 20);

      const callArg = prisma.user.findMany.mock.calls[0][0] as any;
      expect(callArg.skip).toBe(40);
      expect(callArg.take).toBe(20);
    });
  });

  describe('getUserById', () => {
    it('should return user with userRoles when found', async () => {
      const mockUser = { id: 1, username: 'admin', userRoles: [] };
      prisma.user.findFirst.mockResolvedValue(mockUser as any);

      const result = await service.getUserById(1);
      expect(result).toEqual(mockUser);
    });

    it('should throw BusinessException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(BusinessException);
    });
  });

  describe('addUser', () => {
    it('should throw when username already exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 1 } as any);

      await expect(
        service.addUser({ username: 'admin', password: '123456' } as any),
      ).rejects.toThrow(BusinessException);
    });

    it('should hash password and create user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({
        id: 1,
        username: 'new',
        email: null,
        phone: null,
      } as any);

      await service.addUser({ username: 'new', password: 'secret' } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('secret', expect.any(Number));
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should throw when id is missing', async () => {
      await expect(service.updateUser({ username: 'x' } as any)).rejects.toThrow(BusinessException);
    });

    it('should throw when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.updateUser({ id: 1, username: 'x' })).rejects.toThrow(BusinessException);
    });

    it('should throw when new username conflicts', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 1, username: 'old' } as any)
        .mockResolvedValueOnce({ id: 2 } as any);

      await expect(service.updateUser({ id: 1, username: 'taken' })).rejects.toThrow(
        BusinessException,
      );
    });

    it('should hash new password when provided', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 1, username: 'old' } as any)
        .mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.update.mockResolvedValue({} as any);

      await service.updateUser({ id: 1, password: 'newpass' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', expect.any(Number));
    });

    it('should not hash when password is not provided', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ id: 1, username: 'old' } as any)
        .mockResolvedValueOnce(null);
      prisma.user.update.mockResolvedValue({} as any);

      await service.updateUser({ id: 1, email: 'a@b.com' });

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('delUser', () => {
    it('should delete user successfully', async () => {
      prisma.user.delete.mockResolvedValue({} as any);

      await service.delUser(1);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw when record not found', async () => {
      const error = { code: 'P2025' };
      prisma.user.delete.mockRejectedValue(error);

      await expect(service.delUser(999)).rejects.toThrow(BusinessException);
    });
  });

  describe('assignRoles', () => {
    it('should throw when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.assignRoles(999, { roleIds: [1] })).rejects.toThrow(BusinessException);
    });

    it('should clear roles and assign new ones', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 1 } as any);
      const tx = mockDeep<any>();
      tx.userRole.deleteMany.mockResolvedValue({});
      tx.userRole.createMany.mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

      await service.assignRoles(1, { roleIds: [1, 2] });

      expect(tx.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 1 } });
      expect(tx.userRole.createMany).toHaveBeenCalled();
    });

    it('should clear roles without createMany when empty array', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 1 } as any);
      const tx = mockDeep<any>();
      tx.userRole.deleteMany.mockResolvedValue({});
      (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(tx));

      await service.assignRoles(1, { roleIds: [] });

      expect(tx.userRole.deleteMany).toHaveBeenCalled();
      expect(tx.userRole.createMany).not.toHaveBeenCalled();
    });
  });
});
