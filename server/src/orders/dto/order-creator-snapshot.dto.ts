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

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/creator-profile/.../profile-image/....jpg',
    description: 'Creator profile image URL at time of order (optional).',
  })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({
    example: 'A-102, Green Avenue\nSaket, New Delhi - 110017\nIndia',
    description:
      "Creator's shipping address for physical-product orders. The recipient name and phone are intentionally omitted — the brand only ever sees the anonymized creator identity.",
  })
  shippingAddress?: string | null;
}
