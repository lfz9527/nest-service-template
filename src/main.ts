import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import session from 'express-session';
import createMySQLStore from 'express-mysql-session';

/**
 * 必须存在的环境变量列表，缺失时启动报错
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'SESSION_MAX_AGE',
  'PORT',
] as const;

/**
 * 启动时校验必需环境变量
 */
function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ 缺少必需的环境变量: ${missing.join(', ')}`);
    process.exit(1);
  }
}

/**
 * 从 DATABASE_URL 解析 MySQL 连接参数
 * 格式：mysql://user:password@host:port/database
 */
function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: u.username,
    password: u.password,
    database: u.pathname.replace('/', ''),
  };
}

/**
 * 应用启动引导函数
 * 创建 NestJS 应用实例，配置 MySQL 持久化 Session 存储，并监听指定端口。
 */
async function bootstrap() {
  // 启动前校验环境变量
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // 全局验证管道 —— 自动校验 DTO 并过滤未声明字段
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // 从 DATABASE_URL 解析数据库连接参数，避免维护两套配置
  const dbConfig = parseDbUrl(process.env.DATABASE_URL!);

  const MySQLStore = createMySQLStore(session);
  const sessionStore = new MySQLStore(dbConfig);

  const isProduction = process.env.NODE_ENV === 'production';

  app.use(
    session({
      // 用于签名 session cookie 的密钥，防止篡改
      secret: process.env.SESSION_SECRET!,
      // 强制每次请求不重新保存未修改的 session，减少 MySQL 写入
      resave: false,
      // 不为未初始化的空 session（如未登录的请求）创建记录，减少存储浪费
      saveUninitialized: false,
      // MySQL 持久化存储，重启不丢失 session
      store: sessionStore,
      cookie: {
        // 登录有效期，单位毫秒
        maxAge: Number(process.env.SESSION_MAX_AGE!),
        // 禁止客户端 JS 读取 cookie，防止 XSS 窃取 sessionId
        httpOnly: true,
        // 限制同站请求才携带 cookie，防御 CSRF
        sameSite: 'lax',
        // 生产环境仅通过 HTTPS 传输 cookie
        secure: isProduction,
      },
    }),
  );

  await app.listen(process.env.PORT!);
}
bootstrap();
