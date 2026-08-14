import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DemoVideoResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'https://cdn.example.com/creator-demo-videos/...mp4' })
  videoUrl!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-demo-videos/thumbnails/...jpg',
  })
  thumbnailUrl?: string | null;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
