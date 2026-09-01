import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandCategory } from '@prisma/client';

/**
 * Brand header shown at the top of the admin brand-detail page. Keyed on
 * BrandProfile.id (the id used by Order.brandId and BrandWishlist.brandId).
 */
export class AdminBrandDetailDto {
  @ApiProperty({ example: 'brand-profile-uuid' })
  brandProfileId!: string;

  @ApiPropertyOptional({ example: 'user-uuid', nullable: true })
  userId!: string | null;

  @ApiPropertyOptional({ example: 'brand@example.com', nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ example: 'Acme Team', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: 'Acme', nullable: true })
  brandName!: string | null;

  @ApiPropertyOptional({ example: 'Jane Doe', nullable: true })
  contactFullName!: string | null;

  @ApiPropertyOptional({ example: 'jane@acme.com', nullable: true })
  contactEmail!: string | null;

  @ApiPropertyOptional({ example: '+91 98765 43210', nullable: true })
  contactPhone!: string | null;

  @ApiPropertyOptional({ example: 'https://acme.com', nullable: true })
  website!: string | null;

  @ApiPropertyOptional({
    example: 'https://instagram.com/acme',
    nullable: true,
  })
  instagramUrl!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brand-logo/logo.png',
    nullable: true,
  })
  logoUrl!: string | null;

  @ApiProperty({ enum: BrandCategory, isArray: true })
  categories!: BrandCategory[];

  @ApiPropertyOptional({ example: 'ACTIVE', nullable: true })
  status!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
