import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class BuyExtraRevisionsDto {
  @ApiPropertyOptional({
    description:
      'Number of revision packs to buy in one payment (each pack grants 2 revisions). Defaults to 1.',
    minimum: 1,
    maximum: 20,
    default: 1,
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  quantity?: number;
}
