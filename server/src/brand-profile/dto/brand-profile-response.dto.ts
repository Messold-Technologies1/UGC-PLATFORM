import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandCategory, BrandProductType } from '@prisma/client';

export class BrandProfileResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiPropertyOptional({
    example: 'uuid',
    nullable: true,
    description: 'Set for standalone brand accounts; null for agency-managed brands.',
  })
  userId!: string | null;

  @ApiPropertyOptional({
    example: 'uuid',
    nullable: true,
    description: 'Owning agency when this brand is agency-managed.',
  })
  agencyId!: string | null;

  @ApiProperty({ example: 'brand@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  contactFullName!: string | null;

  @ApiPropertyOptional({ example: 'brand@example.com' })
  contactEmail!: string | null;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  contactPhone!: string | null;

  @ApiProperty({ example: 'Acme' })
  brandName!: string;

  @ApiPropertyOptional({
    example: 'brand-pronunciation/<brandProfileId>/<uuid>.webm',
    nullable: true,
  })
  brandPronunciationAudioKey!: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/brand-pronunciation/...webm',
    nullable: true,
  })
  brandPronunciationAudioUrl!: string | null;

  @ApiPropertyOptional({ example: 'brand-logo/<brandProfileId>/<uuid>.png' })
  logoKey!: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/brand-logo/...png' })
  logoUrl!: string | null;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  website!: string | null;

  @ApiPropertyOptional({ example: 'https://instagram.com/acme' })
  instagramUrl!: string | null;

  @ApiPropertyOptional({ enum: BrandProductType })
  productType!: BrandProductType | null;

  @ApiProperty({
    enum: BrandCategory,
    isArray: true,
    description: 'Selected brand categories.',
  })
  categories!: BrandCategory[];

  @ApiPropertyOptional({
    example: 'Handmade crafts',
    nullable: true,
    description: 'Custom category label when categories includes OTHER.',
  })
  otherCategoryLabel!: string | null;

  @ApiProperty({ example: true })
  whatsappNotificationsEnabled!: boolean;

  @ApiProperty({ example: true })
  emailNotificationsEnabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
