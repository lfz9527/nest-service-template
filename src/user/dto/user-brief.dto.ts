import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '../../constant';

export class UserBriefDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'test@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  phone?: string;

  @ApiProperty({ description: '状态', enum: EntityStatus, example: EntityStatus.ENABLED })
  status: number;
}
