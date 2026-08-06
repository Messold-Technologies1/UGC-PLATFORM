import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgencyBrandSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  brandName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;
}
