import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({ status: 200, description: '服务正常', schema: { example: { status: 'ok' } } })
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
