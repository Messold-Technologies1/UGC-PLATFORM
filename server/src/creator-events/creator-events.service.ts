import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ON_LOCATION_SHOOT_OPTION_SLUG } from '../creator-profile/on-location-shoot.util';
import {
  notExpiredFilter,
  resolveEventDates,
} from './creator-event-dates.util';
import {
  CREATOR_EVENT_DAILY_LIMIT,
  CREATOR_EVENT_MAX_PAGE_SIZE,
  CREATOR_EVENT_PAGE_SIZE,
} from './creator-events.constants';
import {
  feedCreatorSelect,
  mapAdminEvent,
  mapFeedEvent,
  mapOwnEvent,
} from './creator-event.mapper';
import {
  AdminCreatorEventDto,
  CreatorEventDto,
  FeedCreatorEventDto,
} from './dto/creator-event.dto';
import type { AdminEventStatus } from './dto/list-admin-creator-events-query.dto';

export interface PagedEvents<T> {
  items: T[];
  nextCursor: string | null;
}

/** Columns every view of a post reads. */
const eventScalarSelect = {
  id: true,
  body: true,
  createdAt: true,
  editedAt: true,
  startsOn: true,
  endsOn: true,
  hiddenAt: true,
  hiddenReason: true,
} satisfies Prisma.CreatorEventSelect;

/**
 * Newest first, with `id` as the tiebreaker so the order is total. Two posts
 * written in the same millisecond would otherwise be free to swap places
 * between pages and duplicate or skip a row.
 */
const newestFirst: Prisma.CreatorEventOrderByWithRelationInput[] = [
  { createdAt: 'desc' },
  { id: 'desc' },
];

@Injectable()
export class CreatorEventsService {
  constructor(private readonly prisma: PrismaService) {}

  private pageSize(limit?: number): number {
    if (!limit || limit < 1) return CREATOR_EVENT_PAGE_SIZE;
    return Math.min(limit, CREATOR_EVENT_MAX_PAGE_SIZE);
  }

  /**
   * Prisma's `cursor` + `skip: 1` is a real keyset read against the
   * (createdAt DESC, id DESC) index — not OFFSET. A post published while a
   * brand is scrolling therefore shifts nothing: the next page still starts
   * after the row the client last saw.
   */
  private cursorArgs(
    cursor?: string,
  ): Pick<Prisma.CreatorEventFindManyArgs, 'cursor' | 'skip'> {
    return cursor ? { cursor: { id: cursor }, skip: 1 } : {};
  }

  private paginate<T extends { id: string }>(
    rows: T[],
    size: number,
  ): { page: T[]; nextCursor: string | null } {
    // One row over the page size answers "is there more?" without a count().
    const hasMore = rows.length > size;
    const page = hasMore ? rows.slice(0, size) : rows;
    return { page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  /**
   * Resolved once per page rather than per row: the add-on catalog name that
   * marks a creator as sellable for on-location shoots.
   */
  private async onLocationOptionName(): Promise<string | null> {
    const option = await this.prisma.creatorAddOnOption.findUnique({
      where: { slug: ON_LOCATION_SHOOT_OPTION_SLUG },
      select: { name: true },
    });
    return option?.name ?? null;
  }

  private async creatorForUser(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true, isListed: true },
    });
    if (!creator) throw new NotFoundException('Creator profile not found');
    return creator;
  }

  /**
   * Loads one of the caller's own posts.
   *
   * A post belonging to someone else is reported as NOT FOUND, never as
   * forbidden: 403 would confirm the id exists and let someone walk the table
   * by guessing ids.
   */
  private async ownEventOrThrow(creatorId: string, eventId: string) {
    const event = await this.prisma.creatorEvent.findFirst({
      where: { id: eventId, creatorId, deletedAt: null },
      select: eventScalarSelect,
    });
    if (!event) throw new NotFoundException('Post not found');
    return event;
  }

  // ---------------------------------------------------------------- creator

  async listMyEvents(
    userId: string,
    query: { limit?: number; cursor?: string },
  ): Promise<PagedEvents<CreatorEventDto>> {
    const creator = await this.creatorForUser(userId);
    const size = this.pageSize(query.limit);

    // Hidden posts ARE included here. The creator is the one person who must
    // keep seeing a hidden post, with the reason attached.
    const rows = await this.prisma.creatorEvent.findMany({
      where: { creatorId: creator.id, deletedAt: null },
      orderBy: newestFirst,
      take: size + 1,
      ...this.cursorArgs(query.cursor),
      select: eventScalarSelect,
    });

    const { page, nextCursor } = this.paginate(rows, size);
    return { items: page.map(mapOwnEvent), nextCursor };
  }

  /** Posts published in the last 24h — drives the daily ceiling and the UI counter. */
  async countRecentPosts(userId: string): Promise<number> {
    const creator = await this.creatorForUser(userId);
    return this.postsInLastDay(creator.id);
  }

  private postsInLastDay(creatorId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.prisma.creatorEvent.count({
      where: { creatorId, deletedAt: null, createdAt: { gte: since } },
    });
  }

  async createEvent(
    userId: string,
    input: { body: string; startsOn?: string; endsOn?: string },
  ): Promise<CreatorEventDto> {
    const creator = await this.creatorForUser(userId);

    // An unlisted creator has no audience: the feed filters them out anyway.
    // Refusing here is honest about that instead of accepting a post into
    // nothing.
    if (!creator.isListed) {
      throw new ForbiddenException(
        'Your profile has to be live before you can post an event.',
      );
    }

    const postedToday = await this.postsInLastDay(creator.id);
    if (postedToday >= CREATOR_EVENT_DAILY_LIMIT) {
      throw new ForbiddenException(
        `You can post up to ${CREATOR_EVENT_DAILY_LIMIT} times a day. Try again tomorrow.`,
      );
    }

    const { startsOn, endsOn } = resolveEventDates(input);

    const event = await this.prisma.creatorEvent.create({
      data: {
        creatorId: creator.id,
        body: normalizeBody(input.body),
        startsOn,
        endsOn,
      },
      select: eventScalarSelect,
    });
    return mapOwnEvent(event);
  }

  async updateEvent(
    userId: string,
    eventId: string,
    input: { body: string; startsOn?: string; endsOn?: string },
  ): Promise<CreatorEventDto> {
    const creator = await this.creatorForUser(userId);
    const existing = await this.ownEventOrThrow(creator.id, eventId);

    const next = normalizeBody(input.body);
    const { startsOn, endsOn } = resolveEventDates(input);

    const datesChanged =
      sameDay(startsOn, existing.startsOn) === false ||
      sameDay(endsOn, existing.endsOn) === false;

    // An edit that changes nothing must not stamp "edited" on the card.
    if (next === existing.body && !datesChanged) return mapOwnEvent(existing);

    const event = await this.prisma.creatorEvent.update({
      where: { id: existing.id },
      data: { body: next, startsOn, endsOn, editedAt: new Date() },
      select: eventScalarSelect,
    });
    return mapOwnEvent(event);
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const creator = await this.creatorForUser(userId);
    const existing = await this.ownEventOrThrow(creator.id, eventId);

    // Soft delete. If a brand reports a post and the creator removes it a
    // moment later, a hard delete would destroy the only record of what was
    // said; support would have nothing to answer with.
    await this.prisma.creatorEvent.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }

  // ------------------------------------------------------------------ brand

  async listFeed(query: {
    limit?: number;
    cursor?: string;
  }): Promise<PagedEvents<FeedCreatorEventDto>> {
    const size = this.pageSize(query.limit);

    const rows = await this.prisma.creatorEvent.findMany({
      where: {
        deletedAt: null,
        hiddenAt: null,
        // The same discovery gate brand browse uses. Without it an unlisted
        // creator would reach brands through this side door.
        creator: { isListed: true },
        // A trip that finished last week is noise to a brand browsing today.
        // A post ending today still shows for all of today.
        ...notExpiredFilter(),
      },
      orderBy: newestFirst,
      take: size + 1,
      ...this.cursorArgs(query.cursor),
      select: { ...eventScalarSelect, creator: { select: feedCreatorSelect } },
    });

    const { page, nextCursor } = this.paginate(rows, size);
    const optionName = await this.onLocationOptionName();
    return {
      items: page.map((row) => mapFeedEvent(row, optionName)),
      nextCursor,
    };
  }

  // ------------------------------------------------------------------ admin

  async listForAdmin(query: {
    limit?: number;
    cursor?: string;
    status?: AdminEventStatus;
    search?: string;
  }): Promise<PagedEvents<AdminCreatorEventDto>> {
    const size = this.pageSize(query.limit);

    const where: Prisma.CreatorEventWhereInput = { deletedAt: null };
    if (query.status === 'visible') where.hiddenAt = null;
    if (query.status === 'hidden') where.hiddenAt = { not: null };
    if (query.search) {
      where.OR = [
        { body: { contains: query.search, mode: 'insensitive' } },
        {
          creator: {
            publicSlug: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const rows = await this.prisma.creatorEvent.findMany({
      where,
      orderBy: newestFirst,
      take: size + 1,
      ...this.cursorArgs(query.cursor),
      select: {
        ...eventScalarSelect,
        deletedAt: true,
        creatorId: true,
        creator: { select: { publicSlug: true } },
        hiddenByUser: { select: { name: true } },
      },
    });

    const { page, nextCursor } = this.paginate(rows, size);
    return { items: page.map(mapAdminEvent), nextCursor };
  }

  async hideEvent(
    adminUserId: string,
    eventId: string,
    reason?: string,
  ): Promise<AdminCreatorEventDto> {
    await this.adminEventOrThrow(eventId);
    const event = await this.prisma.creatorEvent.update({
      where: { id: eventId },
      data: {
        hiddenAt: new Date(),
        hiddenByUserId: adminUserId,
        hiddenReason: reason?.length ? reason : null,
      },
      select: this.adminSelect(),
    });
    return mapAdminEvent(event);
  }

  async unhideEvent(eventId: string): Promise<AdminCreatorEventDto> {
    await this.adminEventOrThrow(eventId);
    const event = await this.prisma.creatorEvent.update({
      where: { id: eventId },
      data: { hiddenAt: null, hiddenByUserId: null, hiddenReason: null },
      select: this.adminSelect(),
    });
    return mapAdminEvent(event);
  }

  private adminSelect() {
    return {
      ...eventScalarSelect,
      deletedAt: true,
      creatorId: true,
      creator: { select: { publicSlug: true } },
      hiddenByUser: { select: { name: true } },
    } satisfies Prisma.CreatorEventSelect;
  }

  private async adminEventOrThrow(eventId: string) {
    const event = await this.prisma.creatorEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Post not found');
    return event;
  }
}

/** Two @db.Date values, or nulls, naming the same calendar day. */
function sameDay(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}

/**
 * Validation already trimmed and length-checked the body. This collapses runs
 * of blank lines so one post cannot push the next card off a brand's screen —
 * the card renders with `white-space: pre-line`, so every newline shows.
 */
function normalizeBody(body: string): string {
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
