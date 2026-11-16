import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

import {
  IsE164Phone,
  NormalizeE164Phone,
} from '../../common/phone/phone-e164.util';

export class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @NormalizeE164Phone()
  @IsE164Phone()
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  code!: string;
}
