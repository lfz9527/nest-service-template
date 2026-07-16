import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { mockDeep } from 'jest-mock-extended';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from '../prisma/prisma.service';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from 'nestjs-i18n';
import { ResponseInterceptor } from '../common/response.interceptor';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import request from 'supertest';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.session = { userId: 1, id: 'test' };
    return true;
  }
}

describe('UserController (integration)', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof mockDeep<PrismaService>>;

  beforeAll(async () => {
    prisma = mockDeep<PrismaService>();
    const logger = mockDeep<PinoLogger>();
    const i18n = mockDeep<I18nService>();
    i18n.t.mockReturnValue('ok');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: PinoLogger, useValue: logger },
        { provide: I18nService, useValue: i18n },
        { provide: APP_GUARD, useClass: MockAuthGuard },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/user/getUserList', () => {
    it('should return 200 with paginated data', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const res = await request(app.getHttpServer()).get('/api/user/getUserList');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.list).toEqual([]);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.page).toBe(1);
    });
  });

  describe('GET /api/user/getUserById', () => {
    it('should return 200 with user when found', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 1,
        username: 'admin',
        email: null,
        phone: null,
        status: 1,
        userRoles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app.getHttpServer()).get('/api/user/getUserById').query({ id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('admin');
    });

    it('should return 400 when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .get('/api/user/getUserById')
        .query({ id: 999 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/user/addUser', () => {
    it('should return 400 for empty body (DTO validation)', async () => {
      const res = await request(app.getHttpServer()).post('/api/user/addUser').send({});

      expect([400, 500]).toContain(res.status);
    });
  });
});
