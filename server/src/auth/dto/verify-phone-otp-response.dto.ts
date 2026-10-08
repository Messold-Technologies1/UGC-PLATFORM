import { ApiProperty } from '@nestjs/swagger';

export class VerifyPhoneOtpResponseDto {
  @ApiProperty({
    example: 'approved',
    description:
      'Verification check status: approved, pending, expired or max_attempts_reached.',
  })
  status!: string;

  @ApiProperty({
    example: true,
    description:
      'True when the phone was saved and marked verified for this user.',
  })
  phoneVerified!: boolean;
}
