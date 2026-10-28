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
    example:
      'https://cdn.example.com/creator-profile/.../profile-image/....jpg',
    description: 'Creator profile image URL at time of order (optional).',
  })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  city?: string | null;

  @ApiPropertyOptional({
    type: [String],
    example: ['English', 'Hindi'],
    description: 'Creator languages available in the order details snapshot.',
  })
  languages?: string[];

  @ApiPropertyOptional({
    example: 'Tech',
    description: 'Creator primary niche/category from the profile.',
  })
  primaryNiche?: string | null;

  @ApiPropertyOptional({
    example: 'A-102, Green Avenue\nSaket, New Delhi - 110017\nIndia',
    description:
      "Creator's shipping address for physical-product orders. Display name stays anonymized; phone is included so the brand can ship.",
  })
  shippingAddress?: string | null;

  @ApiPropertyOptional({
    example: '+919876543210',
    description:
      "Creator's phone for courier contact on physical-product orders.",
    nullable: true,
  })
  phone?: string | null;

  @ApiPropertyOptional({
    description:
      'True when the creator phone is OTP-verified (phoneVerified + phoneOtpLastStatus === approved).',
  })
  phoneVerified?: boolean;
}
