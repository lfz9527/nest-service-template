import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEV_ONLY_KEY } from '../decorators/dev-only.decorator';

@Injectable()
export class DevGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isDevOnly = this.reflector.getAllAndOverride<boolean>(DEV_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isDevOnly && process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    return true;
  }
}
