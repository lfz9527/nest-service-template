// 根据 NODE_ENV 加载对应环境配置文件
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node ./prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL']!,
  },
});
