import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, CommonModule],
  controllers: [AppController],
})
export class AppModule {}
