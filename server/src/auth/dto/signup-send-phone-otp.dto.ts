import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class SignupSendPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(8)
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone!: string;
}
