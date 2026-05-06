import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class SendPhoneOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'E.164 phone number including country code.',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone!: string;
}
