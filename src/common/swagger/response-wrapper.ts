import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiProperty, ApiResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * 统一响应包装的 OpenAPI Schema
 * 对应 ApiResponse.success() 生成的 { code, message, success, data } 结构
 */
export class ApiResponseWrapperDto {
  @ApiProperty({ description: '业务状态码，0=成功', example: 0 })
  code: number;

  @ApiProperty({ description: '提示消息', example: '操作成功' })
  message: string;

  @ApiProperty({ description: '是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '业务数据' })
  data: unknown;
}

/**
 * 分页列表数据结构（与 ListResult 对应）
 */
export class PaginatedDataDto<T> {
  @ApiProperty({ description: '数据列表' })
  list: T[];

  @ApiProperty({ description: '总条数', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 10 })
  pageSize: number;
}

/**
 * 标注单个资源成功响应的装饰器组合
 * 生成 Swagger 文档中的 { code: 0, message, success: true, data: <T> } 结构
 *
 * @param dataType — data 字段的实际 DTO 类型
 *
 * @example
 * @ApiResponseWrapper(UserInfoDto)
 * @Get('getUserInfo')
 * getUserInfo() { ... }
 */
export function ApiResponseWrapper<T extends Type>(dataType: T) {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto, dataType),
    ApiResponse({
      status: 200,
      description: '成功',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseWrapperDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(dataType) },
            },
          },
        ],
      },
    }),
  );
}

/**
 * 标注分页列表成功响应的装饰器组合
 * 生成 Swagger 文档中的 { code: 0, data: { list: T[], total, page, pageSize } } 结构
 *
 * @param dataType — list 元素的实际 DTO 类型
 *
 * @example
 * @ApiPaginatedResponse(UserListItemDto)
 * @Get('getUserList')
 * getUserList() { ... }
 */
export function ApiPaginatedResponse<T extends Type>(dataType: T) {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto, PaginatedDataDto, dataType),
    ApiResponse({
      status: 200,
      description: '成功',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseWrapperDto) },
          {
            properties: {
              data: {
                allOf: [
                  { $ref: getSchemaPath(PaginatedDataDto) },
                  {
                    properties: {
                      list: {
                        type: 'array',
                        items: { $ref: getSchemaPath(dataType) },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    }),
  );
}

/**
 * 标注数组资源成功响应的装饰器组合
 * 生成 Swagger 文档中的 { code: 0, message, success: true, data: T[] } 结构
 *
 * @param dataType — 数组元素的 DTO 类型
 *
 * @example
 * @ApiArrayResponse(RoleListItemDto)
 * @Get('getRoleList')
 * getRoleList() { ... }
 */
export function ApiArrayResponse<T extends Type>(dataType: T) {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto, dataType),
    ApiResponse({
      status: 200,
      description: '成功',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseWrapperDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataType) },
              },
            },
          },
        ],
      },
    }),
  );
}

/**
 * 标注仅返回 message 的成功响应（无 data 或 data 为简单对象）
 *
 * @example
 * @ApiMessageResponse()
 * @Post('delUser')
 * delUser() { ... }
 */
export function ApiMessageResponse() {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto),
    ApiResponse({
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
                  message: { type: 'string', description: '操作结果消息' },
                },
              },
            },
          },
        ],
      },
    }),
  );
}

/**
 * 健康检查端点专用响应装饰器
 *
 * @example
 * @ApiHealthResponse()
 * @Get('health')
 * health() { ... }
 */
export function ApiHealthResponse() {
  return applyDecorators(
    ApiExtraModels(ApiResponseWrapperDto),
    ApiResponse({
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
    }),
  );
}

/**
 * 标注常见错误响应（400/401/403）
 * 适用于所有需要登录 + 权限校验的控制器
 *
 * @example
 * @ApiCommonErrorResponses()
 * @Controller('api/user')
 * export class UserController { ... }
 */
export function ApiCommonErrorResponses() {
  return applyDecorators(
    ApiResponse({ status: 400, description: '请求参数错误或业务校验失败' }),
    ApiResponse({ status: 401, description: '未登录' }),
    ApiResponse({ status: 403, description: '权限不足' }),
  );
}
