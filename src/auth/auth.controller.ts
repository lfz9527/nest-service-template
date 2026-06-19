import { Controller, Get, Post, Body, Session, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AppSession } from '../common/types';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

/**
 * 认证控制器
 * 处理登录、登出、验证码获取和用户信息查询等认证相关的 HTTP 请求
 */
@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 获取登录页的图形验证码
   * 公开接口，无需登录即可访问
   * 限流：60 秒内最多 10 次请求
   * GET /public/auth/getCaptcha
   */
  @RateLimit({ windowSeconds: 60, max: 10 })
  @Get('/public/auth/getCaptcha')
  getCaptcha(@Session() session: AppSession) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  /**
   * 用户登录
   * 公开接口，验证验证码和账号密码后建立 session
   * 限流：60 秒内最多 5 次请求
   * POST /public/auth/login
   */
  @RateLimit({ windowSeconds: 60, max: 5 })
  @Post('/public/auth/login')
  login(@Body() dto: LoginDto, @Session() session: AppSession) {
    return this.authService.login(dto, session);
  }

  /**
   * 用户登出
   * 公开接口（需携带有效 session），销毁当前 session
   * POST /public/auth/logout
   */
  @Post('/public/auth/logout')
  logout(@Session() session: AppSession) {
    this.authService.logout(session);
    return { message: '已退出' };
  }

  /**
   * 获取当前登录用户的个人信息与权限菜单
   * 需登录后访问，从 request 中获取 session 再读取 userId
   * GET /api/auth/getUserInfo
   */
  @Get('/api/auth/getUserInfo')
  async getUserInfo(@Req() req: Request) {
    const session = req.session as AppSession;
    return this.authService.getUserInfo(session.userId!);
  }
}
