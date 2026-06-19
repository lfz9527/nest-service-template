import { Controller, Get, Post, Body, Session, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AppSession } from '../common/types';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { API_PATH } from '../common/paths';
import { MSG } from '../common/messages';
import { CONFIG_DEFAULTS } from '../common/config.defaults';

/**
 * 认证控制器
 * 处理登录、登出、验证码获取和用户信息查询等认证相关的 HTTP 请求
 */
@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  /** GET /public/auth/getCaptcha */
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_MAX,
  })
  @Get(API_PATH.AUTH.CAPTCHA)
  getCaptcha(@Session() session: AppSession) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  /** POST /public/auth/login */
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_MAX,
  })
  @Post(API_PATH.AUTH.LOGIN)
  login(@Body() dto: LoginDto, @Session() session: AppSession) {
    return this.authService.login(dto, session);
  }

  /** POST /public/auth/logout */
  @Post(API_PATH.AUTH.LOGOUT)
  logout(@Session() session: AppSession) {
    this.authService.logout(session);
    return { message: MSG.AUTH.LOGOUT_SUCCESS };
  }

  /** GET /api/auth/getUserInfo */
  @Get(API_PATH.AUTH.USER_INFO)
  async getUserInfo(@Req() req: Request) {
    const session = req.session as AppSession;
    return this.authService.getUserInfo(session.userId!);
  }
}
