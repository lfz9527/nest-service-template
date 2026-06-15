import { Controller, Get, Post, Body, Session, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AppSession } from '../common/types';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('/public/auth/getCaptcha')
  getCaptcha(@Session() session: AppSession) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  @Post('/public/auth/login')
  login(@Body() dto: LoginDto, @Session() session: AppSession) {
    return this.authService.login(dto, session);
  }

  @Post('/public/auth/logout')
  logout(@Session() session: AppSession) {
    this.authService.logout(session);
    return { message: '已退出' };
  }

  @Get('/api/auth/getUserInfo')
  async getUserInfo(@Req() req: Request) {
    const session = req.session as AppSession;
    return this.authService.getUserInfo(session.userId!);
  }
}
