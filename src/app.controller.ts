import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiHealthResponse } from './common/swagger';

/** 应用根控制器 — 提供基础的运行状态检查端点 */
@ApiTags('health')
@Controller()
export class AppController {
  /** GET /health — 返回服务运行状态 */
  @ApiOperation({ summary: '健康检查' })
  @ApiHealthResponse()
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
