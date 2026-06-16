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
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const level = config.get<string>('LOG_LEVEL', 'info');
        const pretty = config.get<string>('LOG_PRETTY', 'false') === 'true';
        const filePath = config.get<string>('LOG_FILE_PATH', './logs/app.log');
        const retentionDays = Number(config.get<string>('LOG_RETENTION_DAYS', '7'));
        const maxFileSize = config.get<string>('LOG_MAX_FILE_SIZE', '10m');

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

        return {
          pinoHttp: {
            level,
            transport: {
              targets: [
                {
                  target: 'pino/file',
                  level,
                  options: { destination: 1 },
                },
                {
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
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
