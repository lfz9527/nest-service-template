import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { UserInfoDto } from './dto/user-info.dto';
import { AppSession } from '../common/types';
import { API_PATH } from '../constant';
import { ApiResponseWrapper, ApiCommonErrorResponses } from '../common/swagger';

/** 鉴权 API 控制器 — 需登录后访问 */
@ApiTags('api/auth')
@ApiCommonErrorResponses()
@Controller('api/auth')
export class ApiAuthController {
  constructor(private authService: AuthService) { }

  /** GET /api/auth/getUserInfo — 获取当前登录用户的个人信息及菜单权限树 */
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponseWrapper(UserInfoDto)
  @Get(API_PATH.AUTH.USER_INFO)
  async getUserInfo(@Req() req: Request) {
    const session = req.session as AppSession;
    return this.authService.getUserInfo(session.userId!);
  }
}
