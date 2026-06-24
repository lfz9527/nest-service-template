import { Controller, Get, Post, Body, Session } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResultDto } from './dto/login-result.dto';
import { AppSession } from '../common/types';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { API_PATH, CONFIG_DEFAULTS } from '../constant';
import { ApiResponseWrapper, ApiMessageResponse } from '../common/swagger';
import { I18nService } from 'nestjs-i18n';

@ApiTags('public/auth')
@Controller('public/auth')
export class PublicAuthController {
  constructor(
    private authService: AuthService,
    private i18n: I18nService,
  ) {}

  @ApiOperation({ summary: '获取图形验证码' })
  @ApiResponse({ status: 200, description: 'SVG 验证码图片', schema: { type: 'string' } })
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_MAX,
  })
  @Get(API_PATH.AUTH.CAPTCHA)
  getCaptcha(@Session() session: AppSession) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  @ApiOperation({ summary: '用户登录' })
  @ApiResponseWrapper(LoginResultDto)
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_MAX,
  })
  @Post(API_PATH.AUTH.LOGIN)
  login(@Body() dto: LoginDto, @Session() session: AppSession) {
    return this.authService.login(dto, session);
  }

  @ApiOperation({ summary: '用户登出' })
  @ApiMessageResponse()
  @Post(API_PATH.AUTH.LOGOUT)
  logout(@Session() session: AppSession) {
    this.authService.logout(session);
    return { message: this.i18n.t('auth.logout_success') };
  }
}
