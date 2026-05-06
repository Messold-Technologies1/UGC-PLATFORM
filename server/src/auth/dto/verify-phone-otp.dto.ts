import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength, MaxLength } from 'class-validator';

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(8)
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  code!: string;
}
