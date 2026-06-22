import { NestFactory } from '@nestjs/core';
import { I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from './app.module';
import session from 'express-session';
import createMySQLStore from 'express-mysql-session';
import helmet from 'helmet';
import compression from 'compression';
import net from 'net';
import { CONFIG_DEFAULTS } from './constant';

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
    port: Number(u.port) || CONFIG_DEFAULTS.DB_DEFAULT_PORT,
    user: u.username,
    password: u.password,
    database: u.pathname.replace('/', ''),
  };
}

/**
 * 检查端口是否被占用
 */
function isPortTaken(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

/**
 * 开发环境：自动寻找可用端口，从 startPort 开始逐个检测
 */
async function resolvePort(startPort: number): Promise<number> {
  const maxRetries = 100;
  for (let offset = 0; offset < maxRetries; offset++) {
    const port = startPort + offset;
    if (!(await isPortTaken(port))) {
      return port;
    }
  }
  throw new Error(`无法找到可用端口（起始 ${startPort}，已检测 ${maxRetries} 个）`);
}

/**
 * 应用启动引导函数
 * 创建 NestJS 应用实例，配置 MySQL 持久化 Session 存储，并监听指定端口。
 */
async function bootstrap() {
  // 启动前校验环境变量
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // 安全头 —— 防 XSS、点击劫持、MIME 嗅探等
  app.use(helmet());

  // 跨域 —— 前后端分离时允许浏览器跨域请求（credentials 模式）
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 响应压缩 —— JSON 返回 gzip，大幅缩小传输体积
  app.use(compression());

  // 优雅退出 —— Docker/K8s SIGTERM 时等待当前请求完成
  app.enableShutdownHooks();

  // 全局验证管道 —— 自动校验 DTO 并过滤未声明字段
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // 从 DATABASE_URL 解析数据库连接参数，避免维护两套配置
  const dbConfig = parseDbUrl(process.env.DATABASE_URL!);

  const MySQLStore = createMySQLStore(session);
  const sessionStore = new MySQLStore(dbConfig);

  const configuredPort = Number(process.env.PORT!);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: Number(process.env.SESSION_MAX_AGE!),
        httpOnly: true,
        sameSite: CONFIG_DEFAULTS.SESSION_SAME_SITE,
        secure: isProduction,
      },
    }),
  );

  // 生产环境：固定端口，冲突直接报错
  // 开发环境：端口被占用时自动切换下一个可用端口
  const port = isProduction ? configuredPort : await resolvePort(configuredPort);

  if (port !== configuredPort) {
    console.log(`⚠️  端口 ${configuredPort} 已被占用，自动切换到 ${port}`);
  }

  await app.listen(port);
  console.log(`🚀 服务已启动: http://localhost:${port}`);
}
bootstrap();
