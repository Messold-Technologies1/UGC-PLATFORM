import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreatorContentVolumeBucket,
  CreatorFacetDimension,
  CreatorGender,
  CreatorLanguageFluency,
} from '@prisma/client';

export class CreatorPublicListPackageDto {
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

  @ApiPropertyOptional({ example: 'fitness' })
  industryLabel?: string | null;

  @ApiProperty({ type: [String], example: ['testimonial', 'skincare'] })
  tags!: string[];

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

  @ApiProperty({ enum: CreatorLanguageFluency })
  fluency!: CreatorLanguageFluency;
}

export class CreatorPublicListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/<id>/intro/<uuid>.mp4',
    description: 'Public intro video URL for discovery cards (optional).',
  })
  introVideoUrl?: string | null;

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

  @ApiProperty({ type: [String], example: ['UGC Video', 'Product Demo'] })
  categories!: string[];

  @ApiProperty({ type: [String], example: ['skincare', 'minimal aesthetic'] })
  personaTags!: string[];

  @ApiProperty({ type: [String], example: ['does not accept alcohol'] })
  restrictions!: string[];

  @ApiProperty({ type: () => [CreatorPublicListPackageDto] })
  packages!: CreatorPublicListPackageDto[];

  @ApiProperty({ type: () => [CreatorPublicListPortfolioVideoDto] })
  portfolioVideos!: CreatorPublicListPortfolioVideoDto[];
}
