/** A post as its author sees it on /creator/events. */
export interface CreatorEventApi {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  /** YYYY-MM-DD, or null. Optional and independent of each other. */
  startsOn: string | null;
  endsOn: string | null;
  /**
   * The end date has passed, so the post has left the brand feed. It stays in
   * the creator's own list — a post vanishing unexplained is worse.
   */
  ended: boolean;
  /** Hidden by an admin: gone from the brand feed, still listed here. */
  hidden: boolean;
  hiddenReason: string | null;
}

/**
 * The creator block on a feed card.
 *
 * `name` is the public slug and nothing else — brands never see a creator's
 * real name anywhere on GoCollab, and a free-text feed is exactly where that
 * would otherwise slip. `publicSlug` is the canonical URL segment, which
 * differs from `name` only for creators an admin has chosen to reveal.
 */
export interface CreatorEventAuthorApi {
  id: string;
  name: string;
  publicSlug: string;
  profileImageUrl: string | null;
  city: string | null;
  /** Niches, primary first. The card tints its band on the first one. */
  categories: string[];
  avgRating: string | null;
  reviewCount: number;
  ordersCompleted: number;
  startingPrice: number | null;
  deliveryDays: number | null;
  onLocationShoot: boolean;
  firstOrderFree: boolean;
}

/** A post as a brand sees it in the feed. */
export interface FeedCreatorEventApi {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  startsOn: string | null;
  endsOn: string | null;
  creator: CreatorEventAuthorApi;
}

/** A post as an admin sees it in the moderation table. */
export interface AdminCreatorEventApi {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  creatorId: string;
  creatorName: string;
  startsOn: string | null;
  endsOn: string | null;
  ended: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
  hiddenByName: string | null;
  deletedAt: string | null;
}

export interface PagedEvents<T> {
  items: T[];
  /** Id of the last row on this page; null once there are no more. */
  nextCursor: string | null;
}

export type AdminEventStatus = "all" | "visible" | "hidden";
