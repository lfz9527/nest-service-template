import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 可复用分页请求 DTO
 * 用于所有列表接口的查询参数
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
