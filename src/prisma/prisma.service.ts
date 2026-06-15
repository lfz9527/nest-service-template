import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Prisma 数据库服务
 * 封装 PrismaClient，在模块初始化时自动连接数据库，
 * 在模块销毁时自动断开连接，简化生命周期管理。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
    });
  }

  /**
   * 模块初始化时建立数据库连接
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * 模块销毁时断开数据库连接，释放资源
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
