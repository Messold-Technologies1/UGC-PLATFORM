import { ApprovalStatus } from '@prisma/client';
import {
  nextApprovalStatusOnCompletion,
  recomputeCreatorListingState,
} from './creator-listing-state.util';

describe('nextApprovalStatusOnCompletion', () => {
  const profileFirst = true;

  it('Building → complete → Self complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.PENDING,
        profileFirst,
      }),
    ).toBe(ApprovalStatus.SELF_COMPLETED);
  });

  it('leaves a still-incomplete Building profile in place', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: false,
        currentStatus: ApprovalStatus.PENDING,
        profileFirst,
      }),
    ).toBeNull();
  });

  it('does not bounce Awaiting review back into Self complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: true,
        completeProfile: true,
        currentStatus: ApprovalStatus.PENDING,
        profileFirst,
      }),
    ).toBeNull();
  });

  it('leaves a Self complete profile where it is', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: true,
        completeProfile: true,
        currentStatus: ApprovalStatus.SELF_COMPLETED,
        profileFirst,
      }),
    ).toBeNull();
  });

  it('never sends a completion straight into Awaiting review', () => {
    // The shortlist was the only path that skipped Self complete. Without it,
    // a first completion in profile_first always lands in Self complete.
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.PENDING,
        profileFirst,
      }),
    ).not.toBe(ApprovalStatus.PENDING);
  });

  it('Withdrawn → complete → Self complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.WITHDRAWN,
        profileFirst,
      }),
    ).toBe(ApprovalStatus.SELF_COMPLETED);
  });

  it('Withdrawn → complete in approval_first → Awaiting review', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.WITHDRAWN,
        profileFirst: false,
      }),
    ).toBe(ApprovalStatus.PENDING);
  });

  it('leaves a still-incomplete withdrawn profile in place', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: false,
        currentStatus: ApprovalStatus.WITHDRAWN,
        profileFirst,
      }),
    ).toBeNull();
  });

  it('approval_first keeps a first completion in the single PENDING queue', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.PENDING,
        profileFirst: false,
      }),
    ).toBeNull();
  });

  it('leaves an approved creator alone when they complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.APPROVED,
        profileFirst,
      }),
    ).toBeNull();
  });

  it('leaves a rejected creator alone when they complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.REJECTED,
        profileFirst,
      }),
    ).toBeNull();
  });
});

describe('recomputeCreatorListingState — unmet Go-Live requirements', () => {
  type FakeProfile = {
    completeProfile: boolean;
    isListed: boolean;
    approvalStatus: ApprovalStatus;
    publicPlayableVideos: number;
    instagramConnections: number;
    pricedAddOns: string[];
  };

  /**
   * Minimal Prisma stand-in for the reads `recomputeCreatorListingState` makes.
   * The profile itself is complete on every field the checklist can see from
   * the row, so each test can knock out exactly one requirement.
   */
  function fakeClient(overrides: Partial<FakeProfile> = {}) {
    const profile: FakeProfile = {
      completeProfile: false,
      isListed: false,
      approvalStatus: ApprovalStatus.PENDING,
      publicPlayableVideos: 3,
      instagramConnections: 1,
      pricedAddOns: ['Raw footage'],
      ...overrides,
    };

    const updates: Record<string, unknown>[] = [];

    const client = {
      creatorProfile: {
        findUnique: async () => ({
          profileImageUrl: 'https://cdn.test/a.jpg',
          displayName: 'Test Creator',
          contactEmail: 'creator@test.dev',
          bio: 'Bio text',
          countryName: 'India',
          stateName: 'Delhi',
          city: 'New Delhi',
          gender: 'FEMALE',
          dateOfBirth: new Date('2000-01-01'),
          shippingAddress: '1 Test Road',
          completeProfile: profile.completeProfile,
          isListed: profile.isListed,
          creatorApproval: { status: profile.approvalStatus },
          facetSelections: [
            { rank: 0, option: { dimension: 'CONTENT_CATEGORY' } },
            { rank: 1, option: { dimension: 'CONTENT_CATEGORY' } },
            { rank: 2, option: { dimension: 'CONTENT_CATEGORY' } },
            { rank: 0, option: { dimension: 'CREATOR_TYPE' } },
            { rank: 0, option: { dimension: 'OCCUPATION' } },
            { rank: 0, option: { dimension: 'APPEARANCE' } },
          ],
          addOns: profile.pricedAddOns.map((name) => ({ name })),
          _count: { profileLanguages: 1, packages: 1, restrictions: 0 },
        }),
        update: async (args: { data: Record<string, unknown> }) => {
          updates.push(args.data);
          return args.data;
        },
      },
      creatorPortfolioVideo: {
        count: async () => profile.publicPlayableVideos,
      },
      creatorAddOnOption: {
        findMany: async () => [{ name: 'Raw footage' }],
      },
      socialConnection: { count: async () => profile.instagramConnections },
      creatorApproval: { updateMany: async () => ({ count: 1 }) },
    };

    return { client, updates };
  }

  it('reports every unmet requirement when Go Live cannot latch', async () => {
    const { client, updates } = fakeClient({
      publicPlayableVideos: 2,
      instagramConnections: 0,
    });

    const state = await recomputeCreatorListingState(
      client as never,
      'creator-1',
      true,
    );

    expect(state?.completeProfile).toBe(false);
    expect(state?.isListed).toBe(false);
    expect(state?.missing).toEqual([
      'At least 3 portfolio videos',
      'Instagram connected',
    ]);
    // Nothing changed, so there is no write to make.
    expect(updates).toHaveLength(0);
  });

  it('counts only playable public videos toward the three required', async () => {
    // The wizard counts every public row; a still-mirroring import has no
    // playable bytes, so the server can legitimately disagree with a client
    // that thinks the creator is ready.
    const { client } = fakeClient({ publicPlayableVideos: 0 });

    const state = await recomputeCreatorListingState(
      client as never,
      'creator-1',
      true,
    );

    expect(state?.missing).toContain('At least 3 portfolio videos');
  });

  it('returns no unmet requirements when the checklist passes', async () => {
    const { client } = fakeClient();

    const state = await recomputeCreatorListingState(
      client as never,
      'creator-1',
      true,
    );

    expect(state?.completeProfile).toBe(true);
    expect(state?.missing).toEqual([]);
  });

  it('reports nothing unmet on a draft save, which never evaluates', async () => {
    const { client } = fakeClient({
      publicPlayableVideos: 0,
      instagramConnections: 0,
    });

    const state = await recomputeCreatorListingState(
      client as never,
      'creator-1',
      false,
    );

    expect(state?.completeProfile).toBe(false);
    expect(state?.missing).toEqual([]);
  });
});
