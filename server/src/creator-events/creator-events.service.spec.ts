import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreatorEventsService } from './creator-events.service';
import { CREATOR_EVENT_DAILY_LIMIT } from './creator-events.constants';

/**
 * Creator-side rules: who may post, how often, and what editing or deleting
 * your own post actually writes.
 */
describe('CreatorEventsService — creator actions', () => {
  function makeService(
    opts: {
      creator?: { id: string; isListed: boolean } | null;
      postsToday?: number;
      existing?: Record<string, unknown> | null;
    } = {},
  ) {
    const {
      creator = { id: 'creator-1', isListed: true },
      postsToday = 0,
      existing = null,
    } = opts;

    const create = jest.fn(({ data }: any) =>
      Promise.resolve({
        id: 'event-1',
        body: data.body,
        createdAt: new Date(),
        editedAt: null,
        startsOn: data.startsOn ?? null,
        endsOn: data.endsOn ?? null,
        hiddenAt: null,
        hiddenReason: null,
      }),
    );
    const update = jest.fn(({ data }: any) =>
      Promise.resolve({
        id: 'event-1',
        body: data.body ?? 'unchanged',
        createdAt: new Date(),
        editedAt: data.editedAt ?? null,
        startsOn: data.startsOn ?? null,
        endsOn: data.endsOn ?? null,
        hiddenAt: null,
        hiddenReason: null,
      }),
    );

    const prisma = {
      creatorProfile: { findUnique: jest.fn(() => Promise.resolve(creator)) },
      creatorEvent: {
        count: jest.fn(() => Promise.resolve(postsToday)),
        findFirst: jest.fn(() => Promise.resolve(existing)),
        findMany: jest.fn(() => Promise.resolve([])),
        create,
        update,
      },
      creatorAddOnOption: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };

    return {
      service: new CreatorEventsService(prisma as never),
      prisma,
      create,
      update,
    };
  }

  it('stores the post and reports it as not hidden', async () => {
    const { service, create } = makeService();
    const result = await service.createEvent('user-1', {
      body: 'In Goa until the 23rd.',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creatorId: 'creator-1',
          body: 'In Goa until the 23rd.',
          startsOn: null,
          endsOn: null,
        }),
      }),
    );
    expect(result.hidden).toBe(false);
    expect(result.editedAt).toBeNull();
  });

  it('collapses runs of blank lines so one post cannot swamp a feed card', async () => {
    const { service, create } = makeService();
    await service.createEvent('user-1', { body: 'Line one\n\n\n\n\nLine two' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ body: 'Line one\n\nLine two' }),
      }),
    );
  });

  it('refuses to post for a creator who is not listed yet', async () => {
    const { service, create } = makeService({
      creator: { id: 'creator-1', isListed: false },
    });

    await expect(
      service.createEvent('user-1', { body: 'Hello' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it(`refuses post number ${CREATOR_EVENT_DAILY_LIMIT + 1} in a day`, async () => {
    const { service, create } = makeService({
      postsToday: CREATOR_EVENT_DAILY_LIMIT,
    });

    await expect(
      service.createEvent('user-1', { body: 'Hello' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it('allows the last post inside the daily ceiling', async () => {
    const { service, create } = makeService({
      postsToday: CREATOR_EVENT_DAILY_LIMIT - 1,
    });

    await expect(
      service.createEvent('user-1', { body: 'Hello' }),
    ).resolves.toBeDefined();
    expect(create).toHaveBeenCalled();
  });

  it('stamps editedAt when the body actually changes', async () => {
    const { service, update } = makeService({
      existing: {
        id: 'event-1',
        body: 'Old text',
        createdAt: new Date(),
        editedAt: null,
        startsOn: null,
        endsOn: null,
        hiddenAt: null,
        hiddenReason: null,
      },
    });

    const result = await service.updateEvent('user-1', 'event-1', {
      body: 'New text',
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ body: 'New text' }),
      }),
    );
    expect(result.editedAt).not.toBeNull();
  });

  // Dates are part of the post, so changing only them is still an edit.
  it('stamps editedAt when only the dates change', async () => {
    const { service, update } = makeService({
      existing: {
        id: 'event-1',
        body: 'Same text',
        createdAt: new Date(),
        editedAt: null,
        startsOn: null,
        endsOn: null,
        hiddenAt: null,
        hiddenReason: null,
      },
    });

    await service.updateEvent('user-1', 'event-1', {
      body: 'Same text',
      endsOn: '2026-12-01',
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ editedAt: expect.any(Date) }),
      }),
    );
  });

  it('does not mark a post edited when the text is unchanged', async () => {
    const { service, update } = makeService({
      existing: {
        id: 'event-1',
        body: 'Same text',
        createdAt: new Date(),
        editedAt: null,
        startsOn: null,
        endsOn: null,
        hiddenAt: null,
        hiddenReason: null,
      },
    });

    const result = await service.updateEvent('user-1', 'event-1', {
      body: 'Same text',
    });

    expect(update).not.toHaveBeenCalled();
    expect(result.editedAt).toBeNull();
  });

  it('soft-deletes rather than destroying the row', async () => {
    const { service, update } = makeService({
      existing: {
        id: 'event-1',
        body: 'Text',
        createdAt: new Date(),
        editedAt: null,
        startsOn: null,
        endsOn: null,
        hiddenAt: null,
        hiddenReason: null,
      },
    });

    await service.deleteEvent('user-1', 'event-1');

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  // A 403 would confirm the id exists and let someone walk the table by
  // guessing ids. Both editing and deleting must look like "no such post".
  it.each(['update', 'delete'] as const)(
    "reports another creator's post as not found on %s, never forbidden",
    async (action) => {
      const { service } = makeService({ existing: null });

      const call =
        action === 'update'
          ? service.updateEvent('user-1', 'someone-elses', { body: 'Text' })
          : service.deleteEvent('user-1', 'someone-elses');

      await expect(call).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('scopes the ownership lookup to the caller and to live posts', async () => {
    const { service, prisma } = makeService({
      existing: {
        id: 'event-1',
        body: 'Text',
        createdAt: new Date(),
        editedAt: null,
        startsOn: null,
        endsOn: null,
        hiddenAt: null,
        hiddenReason: null,
      },
    });

    await service.deleteEvent('user-1', 'event-1');

    expect(prisma.creatorEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-1', creatorId: 'creator-1', deletedAt: null },
      }),
    );
  });

  it('shows the creator their own hidden posts, with the reason', async () => {
    const { service, prisma } = makeService();
    prisma.creatorEvent.findMany.mockResolvedValueOnce([
      {
        id: 'event-1',
        body: 'Message me on 98xxx xxxxx',
        createdAt: new Date(),
        editedAt: null,
        startsOn: null,
        endsOn: null,
        hiddenAt: new Date(),
        hiddenReason: 'Off-platform solicitation',
      },
    ] as never);

    const { items } = await service.listMyEvents('user-1', {});

    expect(items[0].hidden).toBe(true);
    expect(items[0].hiddenReason).toBe('Off-platform solicitation');
    // Deleted posts are gone from their list; hidden ones are not.
    expect(prisma.creatorEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creatorId: 'creator-1', deletedAt: null },
      }),
    );
  });

  it('reports a missing creator profile as not found', async () => {
    const { service } = makeService({ creator: null });
    await expect(service.listMyEvents('user-1', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
