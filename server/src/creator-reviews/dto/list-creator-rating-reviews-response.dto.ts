import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorRatingReviewDto } from './creator-rating-review.dto';

export class ListCreatorRatingReviewsResponseDto {
  @ApiProperty({ type: () => [CreatorRatingReviewDto] })
  items!: CreatorRatingReviewDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiPropertyOptional({
    example: '4.75',
    description: 'Creator average rating (string decimal)',
  })
  avgRating?: string | null;

  @ApiProperty({ example: 42 })
  reviewCount!: number;
}
