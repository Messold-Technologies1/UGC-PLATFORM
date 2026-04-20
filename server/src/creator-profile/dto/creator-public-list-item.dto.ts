import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatorPublicListPackageDto {
  @ApiProperty({ example: 'Basic' })
  name!: string;

  @ApiProperty({ example: '199.99' })
  priceAmount!: string;
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

export class CreatorPublicListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/<userId>/<uuid>.jpg',
  })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'UGC creator focusing on skincare' })
  bio?: string | null;

  @ApiPropertyOptional({ example: 'Female' })
  gender?: string | null;

  @ApiProperty({ example: true })
  onLocationAvailable!: boolean;

  @ApiProperty({ type: [String], example: ['English', 'Hindi'] })
  languages!: string[];

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

