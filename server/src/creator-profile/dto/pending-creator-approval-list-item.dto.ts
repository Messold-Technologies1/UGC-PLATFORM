import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalStatus, CreatorGender } from '@prisma/client';
import { CreatorPortfolioVideoPreviewResponseDto } from './creator-profile-response.dto';

export class PendingCreatorContentCategoryDto {
  @ApiProperty({ example: 'beauty' })
  slug!: string;

  @ApiProperty({ example: 'Beauty' })
  label!: string;
}

/** Admin queue row: fields collected at creator signup only. */
export class PendingCreatorApprovalListItemDto {
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

  @ApiPropertyOptional({
    example: 28,
    description: 'Age in years from signup dateOfBirth',
    nullable: true,
  })
  age?: number | null;

  @ApiPropertyOptional({
    example: 'https://instagram.com/jane',
    nullable: true,
  })
  instagramUrl?: string | null;

  @ApiProperty({
    type: () => [PendingCreatorContentCategoryDto],
    description: 'CONTENT_CATEGORY facets from signup categorySlugs',
  })
  contentCategories!: PendingCreatorContentCategoryDto[];

  @ApiProperty({
    type: () => [CreatorPortfolioVideoPreviewResponseDto],
    description: 'Portfolio videos uploaded during signup (direct upload)',
  })
  portfolioVideos!: CreatorPortfolioVideoPreviewResponseDto[];

  @ApiProperty({
    enum: ApprovalStatus,
    example: ApprovalStatus.PENDING,
  })
  approvalStatus!: ApprovalStatus;

  @ApiProperty({
    description: 'When the creator profile was created (signup submitted)',
  })
  submittedAt!: Date;
}
