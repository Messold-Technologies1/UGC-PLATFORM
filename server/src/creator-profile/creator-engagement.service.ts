import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** The three signals that have no other record on the platform. */
export type CreatorEngagementKind =
  | 'profile_view'
  | 'add_to_cart'
  | 'wishlist_add';

const COLUMN: Record<
  CreatorEngagementKind,
  'profileViews' | 'addToCarts' | 'wishlistAdds'
> = {
  profile_view: 'profileViews',
  add_to_cart: 'addToCarts',
  wishlist_add: 'wishlistAdds',
};

const dayStartUtc = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

/**
 * Keeps the day-by-day tally the browse ranking is computed from.
 *
 * These three were pixel calls to Meta and nothing else: a profile view and an
 * add-to-cart left no record on our side at all, and a wishlist save left only
 * live membership, which un-saving deletes. None of them could be counted over
 * a window, so none of them could be ranked on.
 *
 * Counts are raw rather than deduplicated per brand. A brand reopening the
 * same profile ten times is worth ten views, which overstates them — the honest
 * fix is a seen-set per brand per day, and it costs a row per brand per creator
 * per day to buy a signal that sits at weight 1. The client already drops
 * repeat views within a session, which covers the ordinary case; a brand
 * determined to inflate a creator can, and one profile view is worth a
 * hundredth of an order.
 */
@Injectable()
export class CreatorEngagementService {
  private readonly logger = new Logger(CreatorEngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add one to a creator's count for today.
   *
   * Never throws: this is called from paths whose job is something else — a
   * drawer opening, a wishlist save — and none of them should fail because a
   * counter did. A lost increment costs a creator a point of score.
   */
  async record(
    creatorId: string,
    kind: CreatorEngagementKind,
    amount = 1,
  ): Promise<void> {
    if (!creatorId || amount === 0) return;
    const column = COLUMN[kind];
    const day = dayStartUtc(new Date());

    try {
      await this.prisma.creatorEngagementDaily.upsert({
        where: { creatorId_day: { creatorId, day } },
        create: { creatorId, day, [column]: amount },
        update: { [column]: { increment: amount } },
      });
    } catch (err) {
      // A creator id that is not a creator is the common case here — the
      // endpoint is public, so anything can be posted at it. Nothing downstream
      // cares, so it is logged at debug and dropped.
      this.logger.debug(
        `engagement ${kind} for ${creatorId} not recorded: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
