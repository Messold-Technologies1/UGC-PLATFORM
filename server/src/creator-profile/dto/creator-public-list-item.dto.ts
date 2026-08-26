import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreatorContentVolumeBucket,
  CreatorFacetDimension,
  CreatorGender,
} from '@prisma/client';

export class CreatorPublicListPackageDto {
  @ApiPropertyOptional({
    example: 'uuid',
    description:
      'Package id. Populated where the package is orderable (e.g. wishlist detail); omitted on lean discovery cards.',
  })
  id?: string;

  @ApiProperty({ example: 'Basic' })
  name!: string;

  @ApiProperty({ example: '199.99' })
  priceAmount!: string;

  @ApiProperty({ example: 5 })
  deliveryDays!: number;

  @ApiProperty({ example: true })
  basicEditing!: boolean;
}

export class CreatorPublicListPortfolioVideoDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  creatorId!: string;

  @ApiProperty({ example: 'https://cdn.example.com/creator-portfolio/...mp4' })
  videoUrl!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-portfolio/...jpg',
  })
  thumbnailUrl?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class CreatorPublicListFacetDto {
  @ApiProperty({ enum: CreatorFacetDimension })
  dimension!: CreatorFacetDimension;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  label!: string;
}

export class CreatorPublicListLanguageDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  label!: string;
}

export class CreatorPublicListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/<id>/intro/<uuid>.mp4',
    description: 'Public intro video URL for discovery cards (optional).',
  })
  introVideoUrl?: string | null;

  @ApiPropertyOptional({
    example:
      'https://cdn.example.com/creator-profile/<id>/profile-image/<uuid>.jpg',
    description: 'Public profile image URL for discovery cards (optional).',
  })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'India' })
  countryName?: string | null;

  @ApiPropertyOptional({ example: 'Karnataka' })
  stateName?: string | null;

  @ApiPropertyOptional({ example: 'UGC creator focusing on skincare' })
  bio?: string | null;

  @ApiPropertyOptional({ enum: CreatorGender })
  gender?: CreatorGender | null;

  @ApiPropertyOptional({ description: 'Completed age in years' })
  age?: number | null;

  @ApiPropertyOptional({ enum: CreatorContentVolumeBucket })
  contentVolume?: CreatorContentVolumeBucket | null;

  @ApiProperty()
  collaborationCount!: number;

  @ApiPropertyOptional({
    example: '4.75',
    description: 'Average rating from completed order reviews (string decimal)',
  })
  avgRating?: string | null;

  @ApiProperty({ example: 12, description: 'Number of brand reviews received' })
  reviewCount!: number;

  @ApiProperty({
    example: 24,
    description: 'Total orders assigned to this creator',
  })
  totalOrders!: number;

  @ApiProperty({
    example: 18,
    description: 'Orders in a successfully completed status',
  })
  completedOrders!: number;

  @ApiProperty({ example: true })
  onLocationAvailable!: boolean;

  @ApiProperty({
    type: [String],
    description: 'Language labels (legacy-friendly)',
  })
  languages!: string[];

  @ApiProperty({ type: () => [CreatorPublicListLanguageDto] })
  profileLanguages!: CreatorPublicListLanguageDto[];

  @ApiProperty({ type: () => [CreatorPublicListFacetDto] })
  facetSelections!: CreatorPublicListFacetDto[];

  @ApiProperty({ type: [String], example: ['swimwear / beachwear'] })
  restrictions!: string[];

  @ApiProperty({ type: () => [CreatorPublicListPackageDto] })
  packages!: CreatorPublicListPackageDto[];

  @ApiProperty({ type: () => [CreatorPublicListPortfolioVideoDto] })
  portfolioVideos!: CreatorPublicListPortfolioVideoDto[];

  @ApiProperty({
    example: true,
    description:
      'True when the creator has no unavailability covering today. Default true when no schedule exists.',
  })
  available!: boolean;

  @ApiPropertyOptional({
    example: '2026-08-10',
    nullable: true,
    description:
      'Unavailable range start when a schedule exists (active or upcoming)',
  })
  unavailableFrom?: string | null;

  @ApiPropertyOptional({
    example: '2026-08-20',
    nullable: true,
    description:
      'Unavailable range end when a schedule exists (active or upcoming)',
  })
  unavailableTo?: string | null;
}
