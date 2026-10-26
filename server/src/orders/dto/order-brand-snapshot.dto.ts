import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderBrandSnapshotDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiPropertyOptional({
    example: 'Acme Co',
    nullable: true,
    description:
      'Client brand name for agency orders (from brief); otherwise the brand profile name.',
  })
  brandName!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brand-logo/...png',
  })
  logoUrl?: string | null;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    nullable: true,
    description: 'Brand contact name. Admin order views only.',
  })
  contactFullName?: string | null;

  @ApiPropertyOptional({
    example: 'jane@acme.com',
    nullable: true,
    description: 'Brand contact email. Admin order views only.',
  })
  contactEmail?: string | null;

  @ApiPropertyOptional({
    example: 'Northstar Media',
    nullable: true,
    description: 'Agency name when the order was placed by an agency.',
  })
  agencyName?: string | null;

  @ApiPropertyOptional({
    example: 'Northstar Media',
    nullable: true,
    description:
      'The agency managing this brand, when one placed the order on their ' +
      'behalf. Distinct from agencyName: here the BRAND owns the order and ' +
      'the agency only acted, so the buyer shown is still the brand.',
  })
  placedByAgencyName?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/agency-logo/...png',
    nullable: true,
  })
  agencyLogoUrl?: string | null;

  @ApiPropertyOptional({
    example: 'Acme Co',
    nullable: true,
    description: 'Explicit client brand name from the brief (agency orders).',
  })
  clientBrandName?: string | null;
}
