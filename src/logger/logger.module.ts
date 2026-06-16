import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * 全局日志模块
 * 封装 nestjs-pino，根据环境变量动态配置 pino transports：
 * - 开发环境：pino-pretty 彩色控制台输出
 * - 生产环境：JSON 控制台 + pino-roll 文件轮转
 */
@Global()
@Module({
  imports: [
    // 异步工厂模式，从 ConfigService 读取日志配置
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // 从环境变量读取配置，提供默认值兜底
        const level = config.get<string>('LOG_LEVEL', 'info');
        const pretty = config.get<string>('LOG_PRETTY', 'false') === 'true';
        const filePath = config.get<string>('LOG_FILE_PATH', './logs/app.log');
        const retentionDays = Number(config.get<string>('LOG_RETENTION_DAYS', '7'));
        const maxFileSize = config.get<string>('LOG_MAX_FILE_SIZE', '10m');

        // 开发环境：单 target 使用 pino-pretty 输出彩色可读日志
        if (pretty) {
          return {
            pinoHttp: {
              level,
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                },
              },
            },
          };
        }

        // 生产环境：双 target — stdout 输出 JSON + 文件按天轮转
        return {
          pinoHttp: {
            level,
            transport: {
              targets: [
                {
                  // target 1: 控制台输出原始 JSON，供日志采集工具消费
                  target: 'pino/file',
                  level,
                  options: { destination: 1 },
                },
                {
                  // target 2: 文件输出，按天轮转，超限自动清理
                  target: 'pino-roll',
                  level,
                  options: {
                    file: filePath,
                    frequency: 'daily',
                    size: maxFileSize,
                    limit: retentionDays,
                  },
                },
              ],
            },
          },
        };
      },
    }),
  ],
  // 重新导出 PinoLoggerModule 的提供者，使 PinoLogger 可在全局注入
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
