import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import {
  IsE164Phone,
  NormalizeE164Phone,
} from '../../common/phone/phone-e164.util';

export class SignupSendPhoneOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @NormalizeE164Phone()
  @IsE164Phone()
  phone!: string;
}
