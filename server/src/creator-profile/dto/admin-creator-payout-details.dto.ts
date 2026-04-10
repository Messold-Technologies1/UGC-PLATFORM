import { ApiPropertyOptional } from '@nestjs/swagger';

/** Admin-only: full payout details for manual bank/UPI transfer. */
export class AdminCreatorPayoutDetailsDto {
  @ApiPropertyOptional()
  accountHolderName?: string | null;

  @ApiPropertyOptional()
  accountNumber?: string | null;

  @ApiPropertyOptional()
  ifsc?: string | null;

  @ApiPropertyOptional()
  upiId?: string | null;
}
