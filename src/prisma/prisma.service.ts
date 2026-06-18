import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PinoLogger } from 'nestjs-pino';

/**
 * Prisma 数据库服务
 * 封装 PrismaClient，在模块初始化时自动连接数据库，
 * 在模块销毁时自动断开连接，简化生命周期管理。
 * 同时将 Prisma 内部日志事件桥接到 PinoLogger。
 */
interface PrismaLogEvent {
  message: string;
  target: string;
}

interface PrismaQueryEvent extends PrismaLogEvent {
  query: string;
  duration: number;
}

interface PrismaEventEmitter {
  $on(event: 'error' | 'warn', listener: (event: PrismaLogEvent) => void): void;
  $on(event: 'query', listener: (event: PrismaQueryEvent) => void): void;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: PinoLogger) {
    super({
      adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
        ...(process.env.NODE_ENV === 'development'
          ? [{ level: 'query' as const, emit: 'event' as const }]
          : []),
      ],
    });
    this.logger.setContext(PrismaService.name);
  }

  async onModuleInit() {
    // PrismaClient 的 $on 方法泛型在 adapter 模式下推断为 never，
    // 这里通过 PrismaEventEmitter 接口绕过类型推断问题。
    const client: PrismaEventEmitter = this as unknown as PrismaEventEmitter;
    client.$on('error', (event) => {
      this.logger.error({ message: event.message, target: event.target }, 'Prisma error');
    });
    client.$on('warn', (event) => {
      this.logger.warn({ message: event.message, target: event.target }, 'Prisma warning');
    });
    if (process.env.NODE_ENV === 'development') {
      client.$on('query', (event) => {
        this.logger.debug({ query: event.query, duration: event.duration }, 'Prisma query');
      });
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
