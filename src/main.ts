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
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: Number(process.env.SESSION_MAX_AGE!),
        httpOnly: true,
      },
    }),
  );

  await app.listen(process.env.PORT!);
}
bootstrap();
