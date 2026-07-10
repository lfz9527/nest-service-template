import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用户名', example: 'admin' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.username_required') })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: 'Abc12345' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.password_required') })
  @IsString()
  @MinLength(Number(process.env.PASSWORD_MIN_LENGTH) || 6, {
    message: i18nValidationMessage('validation.password_min_length'),
  })
  password: string;

  @ApiProperty({ description: '图形验证码', example: 'a3x9' })
  @IsNotEmpty({ message: i18nValidationMessage('validation.captcha_required') })
  @IsString()
  captcha: string;
}
