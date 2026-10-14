import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Bank / UPI details for manual creator payouts.
 *
 * The rules here mirror `client/features/creators/lib/payout-details.ts` —
 * keep the two in sync so a creator never gets a 400 for something the form
 * accepted (and vice versa). Bank fields are only valid as a complete set;
 * the service rejects a partial bank update.
 */
export class UpsertCreatorPayoutDetailsDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'accountHolderName must be at least 3 characters' })
  @MaxLength(100, { message: 'accountHolderName must be under 100 characters' })
  accountHolderName?: string;

  @ApiPropertyOptional({ example: '123456789012', description: '9–18 digits' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{9,18}$/, {
    message: 'accountNumber must be 9 to 18 digits',
  })
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'HDFC0000123' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'ifsc must be a valid IFSC code (e.g. HDFC0001234)',
  })
  ifsc?: string;

  @ApiPropertyOptional({ example: 'name@okhdfcbank' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    // VPAs are case-insensitive; store them lowercased so the same ID entered
    // from any surface compares equal.
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/, {
    message: 'upiId must be a valid UPI ID (e.g. name@okhdfcbank)',
  })
  upiId?: string;
}
