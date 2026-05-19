import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgencyBrandSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  brandName!: string;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;
}
