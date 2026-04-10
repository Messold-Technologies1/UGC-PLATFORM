import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatorPayoutDetailsMaskedDto {
  @ApiProperty()
  configured!: boolean;

  @ApiPropertyOptional()
  hasBankDetails?: boolean;

  @ApiPropertyOptional()
  accountNumberLast4?: string;

  @ApiPropertyOptional()
  ifsc?: string;

  @ApiPropertyOptional()
  accountHolderName?: string;

  @ApiPropertyOptional()
  hasUpi?: boolean;

  @ApiPropertyOptional()
  upiMasked?: string;
}
