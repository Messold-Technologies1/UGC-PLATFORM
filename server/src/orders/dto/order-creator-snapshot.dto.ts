import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderCreatorSnapshotDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  displayName!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/.../intro/....mp4',
    description: 'Creator intro video URL at time of order (optional).',
  })
  introVideoUrl?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;
}
