import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorRatingReviewBrandSnapshotDto } from './creator-rating-review.dto';

export class CreatorTopReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating!: number;

  @ApiPropertyOptional({
    example: 'Great content and fast turnaround.',
  })
  review?: string | null;

  @ApiProperty({ type: () => CreatorRatingReviewBrandSnapshotDto })
  brand!: CreatorRatingReviewBrandSnapshotDto;
}
