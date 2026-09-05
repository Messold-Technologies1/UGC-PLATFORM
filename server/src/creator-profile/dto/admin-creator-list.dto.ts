import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApprovalStatus, CreatorGender } from '@prisma/client';
import { CreatorPortfolioVideoPreviewResponseDto } from './creator-profile-response.dto';
import { PendingCreatorContentCategoryDto } from './pending-creator-approval-list-item.dto';

export enum AdminCreatorListSegment {
  PENDING = 'pending',
  APPROVED = 'approved',
  NON_APPROVED = 'non_approved',
  INCOMPLETE = 'incomplete',
  SHORTLISTED = 'shortlisted',
  SELF_COMPLETED = 'self_completed',
  LISTED = 'listed',
  FEATURED = 'featured',
}

export class AdminCreatorsListQueryDto {
  @ApiProperty({
    enum: AdminCreatorListSegment,
    example: AdminCreatorListSegment.LISTED,
  })
  @IsEnum(AdminCreatorListSegment)
  segment!: AdminCreatorListSegment;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    example: 'jane',
    description: 'Search by creator display name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class AdminCreatorListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  displayName!: string;

  @ApiPropertyOptional({ example: '+919876543210', nullable: true })
  phone?: string | null;

  @ApiProperty({ example: true })
  phoneVerified!: boolean;

  @ApiPropertyOptional({ example: 'jane@example.com', nullable: true })
  contactEmail?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru', nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ example: 'Karnataka', nullable: true })
  stateName?: string | null;

  @ApiPropertyOptional({ example: 'India', nullable: true })
  countryName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  bio?: string | null;

  @ApiPropertyOptional({ enum: CreatorGender, nullable: true })
  gender?: CreatorGender | null;

  @ApiPropertyOptional({ example: 28, nullable: true })
  age?: number | null;

  @ApiPropertyOptional({ nullable: true })
  instagramUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  driveLink?: string | null;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl?: string | null;

  @ApiProperty({ type: [PendingCreatorContentCategoryDto] })
  contentCategories!: PendingCreatorContentCategoryDto[];

  @ApiProperty({ type: [CreatorPortfolioVideoPreviewResponseDto] })
  portfolioVideos!: CreatorPortfolioVideoPreviewResponseDto[];

  @ApiProperty({ enum: ApprovalStatus })
  approvalStatus!: ApprovalStatus;

  @ApiProperty({ example: false })
  completeProfile!: boolean;

  @ApiProperty({ example: false })
  isListed!: boolean;

  @ApiProperty({ example: false })
  isFeatured!: boolean;

  @ApiPropertyOptional({ example: 1, nullable: true })
  featureRank?: number | null;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z', nullable: true })
  featuredUntil?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  approvedAt?: Date | null;

  @ApiPropertyOptional({ example: '4.50', nullable: true })
  avgRating?: string | null;

  @ApiPropertyOptional({ example: 12 })
  reviewCount?: number;

  @ApiPropertyOptional({ example: '1500.00', nullable: true })
  startingPrice?: string | null;

  @ApiProperty({ example: true })
  onLocationAvailable!: boolean;

  @ApiPropertyOptional({
    example: 'Bipasha Roy',
    nullable: true,
    description: 'Admin who listed / approved this creator',
  })
  approvedByName?: string | null;

  @ApiPropertyOptional({
    example: 'Bipasha Roy',
    nullable: true,
    description: 'Admin who shortlisted this creator',
  })
  shortlistedByName?: string | null;

  @ApiPropertyOptional({
    example: 'Bipasha Roy',
    nullable: true,
    description: 'Admin who sent this creator from Self complete to Awaiting review',
  })
  reviewSentByName?: string | null;

  @ApiProperty()
  submittedAt!: Date;
}

export class AdminCreatorsListResponseDto {
  @ApiProperty({ type: [AdminCreatorListItemDto] })
  items!: AdminCreatorListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

export class AdminFeatureCreatorDto {
  @ApiPropertyOptional({ example: 1, description: 'Lower rank appears first' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  rank: number = 0;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
    nullable: true,
    description: 'Optional expiry. Null/omitted means featured until manually removed.',
  })
  @IsOptional()
  @IsDateString()
  featuredUntil?: string | null;
}

export class AdminCreatorSegmentCountsDto {
  @ApiProperty({ example: 3 })
  pending!: number;

  @ApiProperty({ example: 42 })
  approved!: number;

  @ApiProperty({ example: 5 })
  nonApproved!: number;

  @ApiProperty({ example: 12 })
  incomplete!: number;

  @ApiProperty({ example: 8 })
  shortlisted!: number;

  @ApiProperty({ example: 6 })
  selfCompleted!: number;

  @ApiProperty({ example: 30 })
  listed!: number;

  @ApiProperty({ example: 5 })
  featured!: number;
}
