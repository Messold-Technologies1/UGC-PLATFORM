import { ApprovalStatus } from '@prisma/client';
import { nextApprovalStatusOnCompletion } from './creator-listing-state.util';

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
