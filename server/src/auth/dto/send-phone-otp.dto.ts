import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import {
  IsE164Phone,
  NormalizeE164Phone,
} from '../../common/phone/phone-e164.util';

export class SendPhoneOtpDto {
  @ApiProperty({
    example: '+919876543210',
    description:
      'Phone number in E.164, including the country code. Parsed and ' +
      'canonicalized server-side, so a number carrying its national trunk ' +
      'prefix (e.g. +9108122064860) is corrected rather than stored as sent.',
  })
  @IsString()
  @NormalizeE164Phone()
  @IsE164Phone()
  phone!: string;
}
