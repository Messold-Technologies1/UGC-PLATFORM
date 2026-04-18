import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderCreatorSnapshotDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  displayName!: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/...jpg',
  })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;
}
