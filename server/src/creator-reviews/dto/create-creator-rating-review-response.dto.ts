import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorRatingReviewDto } from './creator-rating-review.dto';

export class CreateCreatorRatingReviewResponseDto {
  @ApiProperty({ type: () => CreatorRatingReviewDto })
  review!: CreatorRatingReviewDto;

  @ApiPropertyOptional({
    example: '4.75',
    description: 'Updated creator average rating (string decimal)',
  })
  avgRating?: string | null;

  @ApiProperty({ example: 12 })
  reviewCount!: number;
}
