import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatorRatingReviewBrandSnapshotDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Acme Co' })
  brandName!: string | null;

  @ApiPropertyOptional()
  logoUrl?: string | null;
}

export class CreatorRatingReviewDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  orderId!: string;

  @ApiProperty({ example: 'uuid' })
  creatorId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating!: number;

  @ApiPropertyOptional()
  review?: string | null;

  @ApiProperty({ type: () => CreatorRatingReviewBrandSnapshotDto })
  brand!: CreatorRatingReviewBrandSnapshotDto;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-15T07:06:29.604Z',
  })
  createdAt!: Date;
}
