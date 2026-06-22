import { Controller, Get } from '@nestjs/common';

/**
 * 应用根控制器
 * 提供基础的运行状态检查端点。
 */
@Controller()
export class AppController {
  /**
   * 健康检查接口
   * GET /health —— 返回简单 JSON 表示服务运行正常。
   */
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
