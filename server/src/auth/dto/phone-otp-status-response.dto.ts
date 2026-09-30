import { ApiProperty } from '@nestjs/swagger';

/**
 * Delivery outcome of the most recent OTP sent to a number.
 *
 * Separate from the send response on purpose: Meta's send API returns
 * `accepted` (queued) even for a number with no WhatsApp account, and the real
 * `failed` verdict only reaches us on the status webhook a few seconds later.
 * The UI checks this once its resend countdown lapses.
 */
export class PhoneOtpStatusResponseDto {
  @ApiProperty({
    enum: ['unknown', 'pending', 'delivered', 'failed'],
    description:
      'Delivery state reported by Meta. `pending` means queued but not yet confirmed.',
  })
  status!: 'unknown' | 'pending' | 'delivered' | 'failed';

  @ApiProperty({
    description:
      'True when Meta reported the number is not reachable on WhatsApp (error 131026).',
  })
  notOnWhatsApp!: boolean;
}
