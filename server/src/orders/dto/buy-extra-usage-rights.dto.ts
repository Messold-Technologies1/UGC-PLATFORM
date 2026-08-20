import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BuyExtraUsageRightsDto {
  @ApiPropertyOptional({
    description:
      'Number of 30-day usage-rights blocks to buy in one payment (each block grants 30 days). Non-refundable. Defaults to 1.',
    minimum: 1,
    default: 1,
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
