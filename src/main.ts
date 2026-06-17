import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import createMySQLStore from 'express-mysql-session';

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
 * 创建 NestJS 应用实例，配置 MySQL 持久化 Session 存储，并监听 3000 端口。
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 从 DATABASE_URL 解析数据库连接参数，避免维护两套配置
  const dbConfig = parseDbUrl(process.env.DATABASE_URL!);

  const MySQLStore = createMySQLStore(session);
  const sessionStore = new MySQLStore(dbConfig);

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
      },
    }),
  );

  await app.listen(process.env.PORT!);
}
bootstrap();
