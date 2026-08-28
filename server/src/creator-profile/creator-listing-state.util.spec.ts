import { ApprovalStatus } from '@prisma/client';
import { nextApprovalStatusOnCompletion } from './creator-listing-state.util';

describe('nextApprovalStatusOnCompletion', () => {
  const profileFirst = true;

  it('Building → Shortlisted → complete → Awaiting review', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.SHORTLISTED,
        wasShortlisted: true,
        profileFirst,
      }),
    ).toBe(ApprovalStatus.PENDING);
  });

  it('still moves a shortlisted creator who is already marked complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: true,
        completeProfile: true,
        currentStatus: ApprovalStatus.SHORTLISTED,
        wasShortlisted: true,
        profileFirst,
      }),
    ).toBe(ApprovalStatus.PENDING);
  });

  it('repairs a shortlisted creator who landed in Self complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: true,
        completeProfile: true,
        currentStatus: ApprovalStatus.SELF_COMPLETED,
        wasShortlisted: true,
        profileFirst,
      }),
    ).toBe(ApprovalStatus.PENDING);
  });

  it('Building → complete (never shortlisted) → Self complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.PENDING,
        wasShortlisted: false,
        profileFirst,
      }),
    ).toBe(ApprovalStatus.SELF_COMPLETED);
  });

  it('unshortlisted creators who then complete go to Self complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: true,
        currentStatus: ApprovalStatus.PENDING,
        wasShortlisted: false,
        profileFirst,
      }),
    ).toBe(ApprovalStatus.SELF_COMPLETED);
  });

  it('does not bounce Awaiting review back into Self complete', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: true,
        completeProfile: true,
        currentStatus: ApprovalStatus.PENDING,
        wasShortlisted: true,
        profileFirst,
      }),
    ).toBeNull();
  });

  it('leaves incomplete shortlisted creators on the shortlist', () => {
    expect(
      nextApprovalStatusOnCompletion({
        wasComplete: false,
        completeProfile: false,
        currentStatus: ApprovalStatus.SHORTLISTED,
        wasShortlisted: true,
        profileFirst,
      }),
    ).toBeNull();
  });
});
