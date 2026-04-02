import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatorLanguageResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'English' })
  language!: string;
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

  @ApiProperty({ example: '199.99' })
  priceAmount!: string;

  @ApiProperty({ example: 3 })
  deliveryDays!: number;
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

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'I make short-form UGC for brands.' })
  bio?: string | null;

  @ApiPropertyOptional({ example: 'Female' })
  gender?: string | null;

  @ApiPropertyOptional({ example: 15 })
  travelRadius?: number | null;

  @ApiProperty({ example: true })
  onLocationAvailable!: boolean;

  @ApiPropertyOptional({ example: '499.00' })
  onLocationFee?: string | null;

  @ApiProperty({ type: () => [CreatorLanguageResponseDto] })
  languages!: CreatorLanguageResponseDto[];

  @ApiProperty({ type: () => [CreatorCategoryResponseDto] })
  categories!: CreatorCategoryResponseDto[];

  @ApiProperty({ type: () => [CreatorPersonaTagResponseDto] })
  personaTags!: CreatorPersonaTagResponseDto[];

  @ApiProperty({ type: () => [CreatorRestrictionResponseDto] })
  restrictions!: CreatorRestrictionResponseDto[];

  @ApiProperty({ type: () => [CreatorPackageResponseDto] })
  packages!: CreatorPackageResponseDto[];

  @ApiPropertyOptional({ type: () => CreatorPortfolioVideoPreviewResponseDto })
  firstPortfolioVideo?: CreatorPortfolioVideoPreviewResponseDto | null;
}
