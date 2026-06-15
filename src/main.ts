import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import createMySQLStore from 'express-mysql-session';

/**
 * 应用启动引导函数
 * 创建 NestJS 应用实例，配置 MySQL 持久化 Session 存储，并监听 3000 端口。
 */
async function bootstrap() {
  // 创建 NestJS 应用实例
  const app = await NestFactory.create(AppModule);

  // 创建 MySQL 存储的 Session 仓库，将会话数据持久化到数据库
  const MySQLStore = createMySQLStore(session);
  const sessionStore = new MySQLStore({
    host: process.env.SESSION_DB_HOST!,
    port: Number(process.env.SESSION_DB_PORT!),
    user: process.env.SESSION_DB_USER!,
    password: process.env.SESSION_DB_PASSWORD!,
    database: process.env.SESSION_DB_NAME!,
  });

  // 注册全局 Session 中间件
  app.use(
    session({
      // 签名密钥，优先使用环境变量，失败时回退到硬编码密钥
      secret: process.env.SESSION_SECRET!,
      // 仅在会话数据变更时重新保存，避免无效写入
      resave: false,
      // 未初始化的空会话不自动保存
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        // Cookie 有效期，单位毫秒
        maxAge: Number(process.env.SESSION_MAX_AGE!),
        // 仅允许 HTTP 请求携带 Cookie，禁止客户端脚本访问
        httpOnly: true,
      },
    }),
  );

  // 启动服务，监听 3000 端口
  await app.listen(3000);
}
bootstrap();
