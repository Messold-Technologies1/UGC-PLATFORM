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

  @ApiProperty({ enum: ['public', 'private'], example: 'public' })
  visibilityStatus!: 'public' | 'private';

  @ApiProperty({ enum: ['UPLOAD', 'INSTAGRAM'], example: 'UPLOAD' })
  source!: 'UPLOAD' | 'INSTAGRAM';

  @ApiProperty({
    enum: ['READY', 'PROCESSING', 'FAILED', 'LINK_ONLY'],
    description:
      'PROCESSING means an import is still being copied and has no videoUrl yet.',
  })
  assetState!: 'READY' | 'PROCESSING' | 'FAILED' | 'LINK_ONLY';

  @ApiPropertyOptional({ example: 'https://www.instagram.com/reel/Cxyz/' })
  igPermalink?: string | null;

  @ApiProperty()
  createdAt!: Date;
}
