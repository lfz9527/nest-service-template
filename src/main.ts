import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';
import createMySQLStore from 'express-mysql-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const MySQLStore = createMySQLStore(session);
  const sessionStore = new MySQLStore({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'dashboard',
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'fallback-secret',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
