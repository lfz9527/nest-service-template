import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { BusinessException } from '../common/exceptions/business.exception';
import * as svgCaptcha from 'svg-captcha';
import * as bcrypt from 'bcryptjs';

jest.mock('svg-captcha');
jest.mock('bcryptjs');

describe('AuthService (unit)', () => {
  let service: AuthService;
  let prisma: MockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const logger = mockDeep<PinoLogger>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: PinoLogger, useValue: logger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('generateCaptcha', () => {
    it('should set captcha text on session and return SVG', () => {
      const session: any = {};
      (svgCaptcha.create as jest.Mock).mockReturnValue({
        text: 'AbcD',
        data: '<svg>mock</svg>',
      });

      const result = service.generateCaptcha(session);

      expect(session.captcha).toBe('abcd');
      expect(result).toBe('<svg>mock</svg>');
    });
  });

  describe('login', () => {
    const mockSession = (captcha?: string) =>
      ({
        captcha,
        id: 'session-1',
        userId: undefined,
      }) as any;

    const mockReq = () =>
      ({
        sessionStore: { destroy: jest.fn((_sid: string, cb: any) => cb(null)) },
      }) as any;

    it('should throw when captcha not initialized on session', async () => {
      await expect(
        service.login({ username: 'a', password: 'b', captcha: 'x' }, mockSession(), mockReq()),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when captcha does not match', async () => {
      await expect(
        service.login(
          { username: 'a', password: 'b', captcha: 'wrong' },
          mockSession('xyz'),
          mockReq(),
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when user not found or disabled', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login(
          { username: 'ghost', password: 'x', captcha: 'abc' },
          mockSession('abc'),
          mockReq(),
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when password is wrong', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'admin',
        passwordHash: 'hash',
        status: 1,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(
          { username: 'admin', password: 'wrong', captcha: 'abc' },
          mockSession('abc'),
          mockReq(),
        ),
      ).rejects.toThrow(BusinessException);
    });

    it('should login successfully and set userId on session', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'admin',
        passwordHash: 'hash',
        status: 1,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const session = mockSession('abc');

      const result = await service.login(
        { username: 'admin', password: 'pw', captcha: 'abc' },
        session,
        mockReq(),
      );

      expect(session.userId).toBe(1);
      expect(result).toEqual({ userId: 1, username: 'admin' });
    });
  });

  describe('getUserInfo', () => {
    it('should return null when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.getUserInfo(999);

      expect(result).toBeNull();
    });

    it('should return user info with filtered enabled menus in tree', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'admin',
        email: null,
        phone: null,
        userRoles: [
          {
            role: {
              status: 1,
              roleMenus: [
                {
                  menu: {
                    id: 1,
                    name: 'root',
                    code: 'root',
                    parentId: null,
                    path: null,
                    icon: null,
                    sortOrder: 1,
                    status: 1,
                  },
                },
              ],
            },
          },
        ],
      } as any);

      const result = await service.getUserInfo(1);

      expect(result).not.toBeNull();
      expect(result!.username).toBe('admin');
      expect(result!.menus).toHaveLength(1);
    });
  });
});
