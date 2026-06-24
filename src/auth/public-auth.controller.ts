import { Controller, Get, Post, Body, Session } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiConsumes, ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResultDto } from './dto/login-result.dto';
import { AppSession } from '../common/types';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { API_PATH, CONFIG_DEFAULTS } from '../constant';
import { ApiResponseWrapper, ApiMessageResponse, ApiResponseWrapperDto } from '../common/swagger';
import { I18nService } from 'nestjs-i18n';

/** 公开认证控制器 — 无需登录即可访问 */
@ApiTags('public/auth')
@Controller('public/auth')
export class PublicAuthController {
  constructor(
    private authService: AuthService,
    private i18n: I18nService,
  ) {}

  /** GET /public/auth/getCaptcha — 获取 SVG 图形验证码 */
  @ApiOperation({ summary: '获取图形验证码' })
  @ApiExtraModels(ApiResponseWrapperDto)
  @ApiResponse({
    status: 200,
    description: '成功',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseWrapperDto) },
        { properties: { data: { type: 'string', description: 'SVG 验证码图片', example: '<svg>...</svg>' } } },
      ],
    },
  })
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.CAPTCHA_MAX,
  })
  @Get(API_PATH.AUTH.CAPTCHA)
  getCaptcha(@Session() session: AppSession) {
    const svg = this.authService.generateCaptcha(session);
    return svg;
  }

  /** POST /public/auth/login — 用户名+密码+验证码登录，成功后写入 Session */
  @ApiOperation({ summary: '用户登录' })
  @ApiConsumes('application/json')
  @ApiBody({ type: LoginDto })
  @ApiResponseWrapper(LoginResultDto)
  @ApiResponse({ status: 400, description: '验证码错误或账号密码不匹配' })
  @RateLimit({
    windowSeconds: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_WINDOW_SECONDS,
    max: CONFIG_DEFAULTS.RATE_LIMIT.LOGIN_MAX,
  })
  @Post(API_PATH.AUTH.LOGIN)
  login(@Body() dto: LoginDto, @Session() session: AppSession) {
    return this.authService.login(dto, session);
  }

  /** POST /public/auth/logout — 销毁当前 Session，退出登录 */
  @ApiOperation({ summary: '用户登出' })
  @ApiMessageResponse()
  @Post(API_PATH.AUTH.LOGOUT)
  logout(@Session() session: AppSession) {
    this.authService.logout(session);
    return { message: this.i18n.t('auth.logout_success') };
  }
}
