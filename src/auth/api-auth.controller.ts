import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { UserInfoDto } from './dto/user-info.dto';
import { AppSession } from '../common/types';
import { API_PATH } from '../constant';
import { ApiResponseWrapper } from '../common/swagger';

@ApiTags('api/auth')
@Controller('api/auth')
export class ApiAuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: '获取当前用户信息（含权限菜单树）', description: '需登录' })
  @ApiResponseWrapper(UserInfoDto)
  @Get(API_PATH.AUTH.USER_INFO)
  async getUserInfo(@Req() req: Request) {
    const session = req.session as AppSession;
    return this.authService.getUserInfo(session.userId!);
  }
}
