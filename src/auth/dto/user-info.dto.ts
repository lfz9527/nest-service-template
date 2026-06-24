import { ApiProperty } from '@nestjs/swagger';
import { MenuNodeDto } from '../../menu/dto/menu-node.dto';

export class UserInfoDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'admin' })
  username: string;

  @ApiProperty({ description: '邮箱', required: false, example: 'admin@example.com' })
  email?: string;

  @ApiProperty({ description: '手机号', required: false, example: '13800138000' })
  phone?: string;

  @ApiProperty({ description: '菜单/权限树', type: [MenuNodeDto] })
  menus: MenuNodeDto[];
}
