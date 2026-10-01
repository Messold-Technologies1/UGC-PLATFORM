import { ApiProperty } from '@nestjs/swagger';

/**
 * Which channel the code actually went out on.
 *
 * Each resend steps one rung down the ladder (WhatsApp → SMS → Twilio Verify),
 * so the UI has to be told where to look — "check WhatsApp" and "check your
 * SMS" are not interchangeable to someone waiting for a code.
 */
export class SendPhoneOtpResponseDto {
  @ApiProperty({
    enum: ['whatsapp', 'sms', 'twilio_verify'],
    example: 'whatsapp',
  })
  channel!: 'whatsapp' | 'sms' | 'twilio_verify';
}
