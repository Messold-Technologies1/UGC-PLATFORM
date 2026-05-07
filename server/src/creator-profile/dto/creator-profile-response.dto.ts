import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalStatus,
  CreatorAgeGroup,
  CreatorContentVolumeBucket,
  CreatorFacetDimension,
  CreatorGender,
  CreatorLanguageFluency,
} from '@prisma/client';

export class CreatorProfileLanguageResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'english' })
  slug!: string;

  @ApiProperty({ example: 'English' })
  label!: string;

  @ApiProperty({ enum: CreatorLanguageFluency })
  fluency!: CreatorLanguageFluency;
}

export class CreatorFacetSelectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: CreatorFacetDimension })
  dimension!: CreatorFacetDimension;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  label!: string;
}

export class CreatorCategoryResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'UGC Video' })
  category!: string;
}

export class CreatorPersonaTagResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Clean aesthetic' })
  tag!: string;
}

export class CreatorRestrictionResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'does not accept alcohol' })
  restriction!: string;
}

export class CreatorPackageResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Basic' })
  name!: string;

  @ApiProperty({
    example: ['1 Video', 'Basic editing'],
    type: [String],
  })
  deliverables!: string[];

  @ApiProperty({ example: 60, description: 'Max 60 seconds.' })
  videoLengthSeconds!: number;

  @ApiProperty({ example: '500' })
  priceAmount!: string;

  @ApiProperty({ example: 5 })
  deliveryDays!: number;

  @ApiProperty({
    example: 2,
    description:
      'Maximum number of revision cycles included in this package.',
  })
  maxRevisions!: number;
}

export class CreatorAddOnResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'On-location shoot fee' })
  name!: string;

  @ApiProperty({ example: '499.00' })
  priceAmount!: string;

  @ApiPropertyOptional({
    example: 'Travel and setup for in-store shoots',
  })
  description?: string | null;
}

export class CreatorPortfolioVideoPreviewResponseDto {
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

export class CreatorProfileResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  displayName!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/<userId>/<uuid>.jpg',
  })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'India' })
  countryName?: string | null;

  @ApiPropertyOptional({ example: 'Karnataka' })
  stateName?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'One line about the creator.' })
  bio?: string | null;

  @ApiPropertyOptional({ enum: CreatorGender })
  gender?: CreatorGender | null;

  @ApiPropertyOptional({ example: '1995-04-15' })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ description: 'Completed age in years (from dateOfBirth).' })
  age?: number | null;

  @ApiPropertyOptional({ enum: CreatorAgeGroup })
  ageGroup?: CreatorAgeGroup | null;

  @ApiPropertyOptional()
  shippingAddress?: string | null;

  @ApiPropertyOptional()
  instagramUrl?: string | null;

  @ApiPropertyOptional({ enum: CreatorContentVolumeBucket })
  contentVolume?: CreatorContentVolumeBucket | null;

  @ApiProperty()
  collaborationCount!: number;

  @ApiPropertyOptional({ example: 15 })
  travelRadius?: number | null;

  @ApiProperty({ example: true })
  onLocationAvailable!: boolean;

  @ApiPropertyOptional({
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
  })
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({
    example: 'Does not meet guidelines.',
  })
  rejectionReason?: string | null;

  @ApiProperty({
    type: () => [CreatorProfileLanguageResponseDto],
    description: 'Languages with fluency (replaces legacy string list).',
  })
  profileLanguages!: CreatorProfileLanguageResponseDto[];

  @ApiProperty({ type: () => [CreatorFacetSelectionResponseDto] })
  facetSelections!: CreatorFacetSelectionResponseDto[];

  @ApiProperty({ type: () => [CreatorCategoryResponseDto] })
  categories!: CreatorCategoryResponseDto[];

  @ApiProperty({ type: () => [CreatorPersonaTagResponseDto] })
  personaTags!: CreatorPersonaTagResponseDto[];

  @ApiProperty({ type: () => [CreatorRestrictionResponseDto] })
  restrictions!: CreatorRestrictionResponseDto[];

  @ApiProperty({ type: () => [CreatorPackageResponseDto] })
  packages!: CreatorPackageResponseDto[];

  @ApiProperty({ type: () => [CreatorAddOnResponseDto] })
  addOns!: CreatorAddOnResponseDto[];

  @ApiPropertyOptional({ type: () => CreatorPortfolioVideoPreviewResponseDto })
  firstPortfolioVideo?: CreatorPortfolioVideoPreviewResponseDto | null;
}
