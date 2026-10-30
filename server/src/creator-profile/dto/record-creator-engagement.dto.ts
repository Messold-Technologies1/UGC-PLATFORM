import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** The two the browser is the only witness to; a wishlist save is recorded server-side. */
export const CLIENT_ENGAGEMENT_KINDS = ['profile_view', 'add_to_cart'] as const;

export type ClientEngagementKind = (typeof CLIENT_ENGAGEMENT_KINDS)[number];

export class RecordCreatorEngagementDto {
  @ApiProperty({
    enum: CLIENT_ENGAGEMENT_KINDS,
    description:
      'profile_view — the profile drawer was opened from the grid. ' +
      'add_to_cart — "Place order" was clicked, opening the order modal. ' +
      'Both already fire a Meta pixel event; this keeps our own copy, which ' +
      'is what the browse ranking is computed from.',
  })
  @IsIn(CLIENT_ENGAGEMENT_KINDS)
  kind!: ClientEngagementKind;
}
