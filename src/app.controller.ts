import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseWrapperDto } from './common/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @ApiOperation({ summary: '健康检查' })
  @ApiExtraModels(ApiResponseWrapperDto)
  @ApiResponse({
    status: 200,
    description: '成功',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseWrapperDto) },
        {
          properties: {
            data: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
              },
            },
          },
        },
      ],
    },
  })
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
