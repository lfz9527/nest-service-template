import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.path.startsWith('/public/')) {
      return true;
    }
    if (!request.session?.userId) {
      throw new UnauthorizedException('请先登录');
    }
    return true;
  }
}
