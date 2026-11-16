import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A post as its own author sees it, on /creator/events.
 *
 * Carries no creator block: the viewer IS the creator. It is the only view
 * that includes hidden posts, because a post vanishing with no explanation is
 * worse for the creator than being told it was hidden.
 */
export class CreatorEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: Date;

  @ApiPropertyOptional({
    nullable: true,
    description: 'When the body was last changed; null if never edited.',
  })
  editedAt!: Date | null;

  @ApiProperty({
    description:
      'Hidden by an admin: gone from the brand feed, still listed here with a banner.',
  })
  hidden!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Why it was hidden, when an admin gave a reason.',
  })
  hiddenReason!: string | null;
}

/**
 * The creator block on a feed card.
 *
 * `name` is the creator's PUBLIC SLUG and nothing else. Every brand-facing
 * response on this platform does the same (see
 * creator-profile.service.ts: "Brands see the opaque public slug, never the
 * creator's real name"), and `displayName` must never reach this DTO —
 * creator-events.feed.spec.ts asserts that it does not.
 */
export class CreatorEventAuthorDto {
  @ApiProperty({ description: 'Creator profile id.' }) id!: string;

  @ApiProperty({
    example: 'riyasharma',
    description: 'The creator public slug. Never their real display name.',
  })
  name!: string;

  @ApiProperty({
    description: 'Canonical public page segment to link to.',
  })
  publicSlug!: string;

  @ApiPropertyOptional({ nullable: true }) profileImageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) city!: string | null;

  @ApiProperty({
    type: [String],
    description: 'Content niches, primary first. The card tints on the first.',
  })
  categories!: string[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Average rating as a decimal string; null until rated.',
  })
  avgRating!: string | null;

  @ApiProperty() reviewCount!: number;
  @ApiProperty() ordersCompleted!: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Package price in rupees; null if they have not priced one.',
  })
  startingPrice!: number | null;

  @ApiPropertyOptional({ nullable: true }) deliveryDays!: number | null;

  @ApiProperty({ description: 'Prices the on-location shoot add-on.' })
  onLocationShoot!: boolean;

  @ApiProperty() firstOrderFree!: boolean;
}

/** A post as a brand sees it in the feed. */
export class FeedCreatorEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) editedAt!: Date | null;
  @ApiProperty({ type: CreatorEventAuthorDto }) creator!: CreatorEventAuthorDto;
}

/** A post as an admin sees it in the moderation table. */
export class AdminCreatorEventDto {
  @ApiProperty() id!: string;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) editedAt!: Date | null;
  @ApiProperty() creatorId!: string;
  @ApiProperty({ description: 'The creator public slug.' })
  creatorName!: string;
  @ApiPropertyOptional({ nullable: true }) hiddenAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) hiddenReason!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Name of the admin who hid it, for the audit line.',
  })
  hiddenByName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Set when the creator deleted their own post.',
  })
  deletedAt!: Date | null;
}
