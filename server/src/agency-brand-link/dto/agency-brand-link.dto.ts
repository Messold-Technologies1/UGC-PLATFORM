import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgencyBrandLinkStatus } from '@prisma/client';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** A brand redeeming an agency's partner code. */
export class RequestAgencyLinkDto {
  @ApiProperty({
    example: 'GC-7F3K-92QX',
    description:
      "The agency's partner ID. Case-insensitive, and tolerant of missing " +
      'dashes or stray spacing from a copy-paste.',
  })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  partnerId!: string;
}

export class RevokeAgencyLinkDto {
  @ApiPropertyOptional({
    example: 'Engagement ended',
    description: 'Optional note kept on the link for the audit trail.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AgencyBrandLinkResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AgencyBrandLinkStatus })
  status!: AgencyBrandLinkStatus;
  @ApiProperty() requestedAt!: Date;
  @ApiProperty({ nullable: true }) respondedAt!: Date | null;
}

/** A link as the BRAND sees it — the agency on the other end. */
export class BrandAgencyLinkItemDto extends AgencyBrandLinkResponseDto {
  @ApiProperty() agencyId!: string;
  @ApiProperty() agencyName!: string;
  @ApiProperty({ nullable: true }) agencyLogoUrl!: string | null;
  @ApiProperty() agencyContactEmail!: string;
}

/** A link as the AGENCY sees it — the brand on the other end. */
export class AgencyBrandLinkItemDto extends AgencyBrandLinkResponseDto {
  @ApiProperty() brandId!: string;
  @ApiProperty({ nullable: true }) brandName!: string | null;
  @ApiProperty({ nullable: true }) brandLogoUrl!: string | null;
}

export class BrandCompletenessDto {
  @ApiProperty({
    description:
      'False while the brand profile is missing anything required to connect ' +
      'an agency.',
  })
  complete!: boolean;

  @ApiProperty({
    isArray: true,
    example: ['BRAND_NAME_MISSING', 'PHONE_NOT_VERIFIED'],
    description: 'Every unmet requirement, so the UI can list them at once.',
  })
  gaps!: string[];
}

export class BrandAgencyLinksResponseDto {
  @ApiProperty({ type: BrandCompletenessDto })
  completeness!: BrandCompletenessDto;

  @ApiProperty({ type: BrandAgencyLinkItemDto, isArray: true })
  links!: BrandAgencyLinkItemDto[];
}

export class AgencyPartnerIdResponseDto {
  @ApiProperty({ example: 'GC-7F3K-92QX' })
  partnerId!: string;

  @ApiProperty({ nullable: true }) issuedAt!: Date | null;
  @ApiProperty({ nullable: true }) rotatedAt!: Date | null;
}
