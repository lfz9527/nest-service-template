import { ApiProperty } from '@nestjs/swagger';

export class LoginResultDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  userId: number;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;
}
