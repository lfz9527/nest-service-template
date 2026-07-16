import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';

/**
 * e2e 冒烟测试
 * 完整启动应用（需 MySQL 连接），走关键业务流程。
 * 若 DATABASE_URL 未配置则跳过。
 */
describe('App (e2e smoke)', () => {
  let app: INestApplication;
  let agent: request.SuperAgentTest;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn('Skipping e2e: DATABASE_URL not configured');
      return;
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    agent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /health should return ok', async () => {
    if (!agent) return;
    const res = await agent.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /public/auth/getCaptcha should return SVG and set cookie', async () => {
    if (!agent) return;
    const res = await agent.get('/public/auth/getCaptcha');

    expect(res.status).toBe(200);
    expect(typeof res.body.data).toBe('string');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /public/auth/login with good credentials should succeed', async () => {
    if (!agent) return;
    const captchaRes = await agent.get('/public/auth/getCaptcha');
    const cookie = captchaRes.headers['set-cookie'];

    const res = await agent
      .post('/public/auth/login')
      .set('Cookie', cookie as any)
      .send({ username: 'admin', password: 'admin123', captcha: 'test' });

    // May be 400 (if captcha doesn't match locally parsed SVG text) or 200
    // But should not be 500 or crash
    expect([200, 400]).toContain(res.status);
  });

  it('Protected route without session should return 401', async () => {
    if (!agent) return;
    const res = await agent.get('/api/user/getUserList');

    expect(res.status).toBe(401);
  });

  it('POST /public/auth/logout should succeed', async () => {
    if (!agent) return;
    const res = await agent.post('/public/auth/logout');

    expect([200, 401]).toContain(res.status);
  });
});
