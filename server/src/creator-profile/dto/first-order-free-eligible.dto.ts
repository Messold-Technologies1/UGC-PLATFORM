import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

/**
 * Per-brand "first order free" eligibility lookup for a set of creators. Kept
 * separate from the (shared, cacheable) creators list so the per-brand flag is
 * never baked into a shared cache — the browse grid overlays it client-side.
 */
export class FirstOrderFreeEligibleRequestDto {
  @ApiProperty({ type: [String], example: ['uuid-a', 'uuid-b'] })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  creatorIds!: string[];
}

export class FirstOrderFreeEligibleResponseDto {
  @ApiProperty({
    type: [String],
    description:
      'Subset of the requested creators whose first order is free for the viewing brand (promo enabled AND no prior order). Empty for guests.',
  })
  eligibleCreatorIds!: string[];
}
