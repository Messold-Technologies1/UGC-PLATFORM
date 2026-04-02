import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PortfolioVideoResponseDto {
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

  @ApiPropertyOptional({ example: 'gym' })
  industryLabel?: string | null;

  @ApiProperty({ type: [String], example: ['testimonial'] })
  tags!: string[];

  @ApiPropertyOptional({ example: 'English' })
  language?: string | null;

  @ApiPropertyOptional({ example: 'Short description' })
  description?: string | null;

  @ApiProperty({ enum: ['public', 'private'], example: 'public' })
  visibilityStatus!: 'public' | 'private';

  @ApiProperty()
  createdAt!: Date;
}

