import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandCategory, BrandProductType } from '@prisma/client';

export class BrandProfileResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  userId!: string;

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

  @ApiPropertyOptional({ example: 'ACK-mee' })
  brandPronunciation!: string | null;

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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
