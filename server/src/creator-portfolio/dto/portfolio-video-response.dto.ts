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

  @ApiProperty({ enum: ['UPLOAD', 'INSTAGRAM', 'ORDER'], example: 'UPLOAD' })
  source!: 'UPLOAD' | 'INSTAGRAM' | 'ORDER';

  @ApiProperty({
    example: false,
    description:
      'True when this video was auto-published from a completed order. Render ' +
      'the "Brand Collab" badge, and hide the delete control (see `deletable`).',
  })
  brandCollab!: boolean;

  @ApiPropertyOptional({
    example: 'Acme Skincare',
    description:
      'Name of the brand this collab was for, for the "Brand Collab · {brand}" ' +
      'badge. Null for non-order videos, or if the brand has no name set.',
  })
  brandName?: string | null;

  @ApiProperty({
    example: true,
    description:
      'False for Brand Collab videos, which cannot be deleted (only hidden via ' +
      'visibilityStatus). The client hides the delete control when false.',
  })
  deletable!: boolean;

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
