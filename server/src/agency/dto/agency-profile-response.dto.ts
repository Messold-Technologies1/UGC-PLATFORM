import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgencyBrandSummaryDto } from './agency-brand-summary.dto';

export class AgencyProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerUserId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  logoKey!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiProperty()
  contactFullName!: string;

  @ApiProperty()
  contactEmail!: string;

  @ApiPropertyOptional({ nullable: true })
  contactPhone!: string | null;

  @ApiProperty()
  contactPhoneVerified!: boolean;

  @ApiPropertyOptional({ nullable: true })
  activeBrandProfileId!: string | null;

  @ApiProperty({ type: [AgencyBrandSummaryDto] })
  brands!: AgencyBrandSummaryDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
