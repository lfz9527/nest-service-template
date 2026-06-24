import { Module } from '@nestjs/common';
import { PublicAuthController } from './public-auth.controller';
import { ApiAuthController } from './api-auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [PublicAuthController, ApiAuthController],
  providers: [AuthService],
})
export class AuthModule {}
