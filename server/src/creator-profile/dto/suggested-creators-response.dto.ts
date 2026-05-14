import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Earliest public portfolio video for suggestion cards */
export class SuggestedCreatorPortfolioVideoDto {
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
}

export class SuggestedCreatorContentCategoryDto {
  @ApiProperty({ example: 'beauty_skincare' })
  slug!: string;

  @ApiProperty({ example: 'Beauty & skincare' })
  label!: string;
}

export class SuggestedCreatorListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  creatorName!: string;

  @ApiProperty({ type: () => [SuggestedCreatorContentCategoryDto] })
  contentCategories!: SuggestedCreatorContentCategoryDto[];

  @ApiPropertyOptional({
    example: '1999.00',
    description: 'Primary package price (string decimal), when a package exists.',
  })
  priceAmount?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({
    type: () => SuggestedCreatorPortfolioVideoDto,
    description: 'Earliest public portfolio video by createdAt.',
  })
  firstPortfolioVideo?: SuggestedCreatorPortfolioVideoDto | null;
}

export class SuggestedCreatorsResponseDto {
  @ApiProperty({
    type: () => [SuggestedCreatorListItemDto],
    description: 'Up to five suggested creators.',
  })
  items!: SuggestedCreatorListItemDto[];
}
