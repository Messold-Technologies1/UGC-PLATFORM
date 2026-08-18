import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorTopReviewDto } from '../../creator-reviews/dto/creator-top-review.dto';
import {
  ApprovalStatus,
  CreatorAgeGroup,
  CreatorContentVolumeBucket,
  CreatorFacetDimension,
  CreatorGender,
} from '@prisma/client';

export class CreatorProfileLanguageResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'english' })
  slug!: string;

  @ApiProperty({ example: 'English' })
  label!: string;
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

  @ApiProperty({
    description:
      'Niche ordering (CONTENT_CATEGORY only): 0 = primary, 1..2 = secondary.',
  })
  rank!: number;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Free text when slug is "other".',
  })
  customLabel!: string | null;
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

  @ApiProperty({ example: 'swimwear / beachwear' })
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

  @ApiProperty({
    example: 'janedoe',
    description:
      'Unique public profile URL slug (lowercase, no spaces). May include a numeric suffix on collision (e.g. janedoe-4821).',
  })
  publicSlug!: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    nullable: true,
    description:
      'Account phone from User (E.164). Omitted when the viewer is not the profile owner or an admin.',
  })
  phone?: string | null;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether the account phone has passed SMS verification. Omitted (not sent) when the viewer is not the profile owner or an admin.',
  })
  phoneVerified?: boolean;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/<id>/intro/<uuid>.mp4',
    description: 'CDN URL for the creator intro video (optional).',
  })
  introVideoUrl?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/<id>/profile-image/<uuid>.jpg',
    description: 'CDN URL for the creator profile image (optional).',
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

  @ApiPropertyOptional({
    example: 'creator@example.com',
    description:
      'Omitted when the viewer is not the profile owner or an admin.',
  })
  contactEmail?: string | null;

  @ApiPropertyOptional({
    description:
      'Omitted when the viewer is not the profile owner or an admin.',
  })
  instagramUrl?: string | null;

  @ApiPropertyOptional({
    description:
      'Omitted when the viewer is not the profile owner or an admin.',
  })
  youtubeUrl?: string | null;

  @ApiPropertyOptional({
    description:
      'Omitted when the viewer is not the profile owner or an admin.',
  })
  snapchatUrl?: string | null;

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
    description:
      'All orders assigned to this creator (any status, including unpaid checkout).',
  })
  totalOrders!: number;

  @ApiProperty({
    example: 18,
    description:
      'Orders successfully completed (ACCEPTED or CREATOR_PAYMENT_DONE).',
  })
  completedOrders!: number;

  @ApiPropertyOptional({ example: 15 })
  travelRadius?: number | null;

  @ApiProperty({ example: true })
  onLocationAvailable!: boolean;

  @ApiPropertyOptional({
    enum: ApprovalStatus,
    example: ApprovalStatus.APPROVED,
  })
  approvalStatus?: ApprovalStatus;

  @ApiProperty({
    description:
      'One-way latch: true once the creator has met every Go-Live requirement.',
    example: false,
  })
  completeProfile!: boolean;

  @ApiProperty({
    description:
      'Discovery gate = approved AND completeProfile. Brands only see listed creators.',
    example: false,
  })
  isListed!: boolean;

  @ApiPropertyOptional({
    example: 'Does not meet guidelines.',
  })
  rejectionReason?: string | null;

  @ApiProperty({
    type: () => [CreatorProfileLanguageResponseDto],
    description: 'Languages the creator can create in.',
  })
  profileLanguages!: CreatorProfileLanguageResponseDto[];

  @ApiProperty({ type: () => [CreatorFacetSelectionResponseDto] })
  facetSelections!: CreatorFacetSelectionResponseDto[];


  @ApiProperty({ type: () => [CreatorRestrictionResponseDto] })
  restrictions!: CreatorRestrictionResponseDto[];

  @ApiProperty({ type: () => [CreatorPackageResponseDto] })
  packages!: CreatorPackageResponseDto[];

  @ApiProperty({ type: () => [CreatorAddOnResponseDto] })
  addOns!: CreatorAddOnResponseDto[];

  @ApiProperty({
    type: () => [CreatorTopReviewDto],
    description: 'Top-rated brand reviews (up to 3), highest rating first.',
  })
  topReviews!: CreatorTopReviewDto[];
}
