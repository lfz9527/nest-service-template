import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolesDto {
  @ApiProperty({ description: '角色 ID 数组', example: [1, 2] })
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
