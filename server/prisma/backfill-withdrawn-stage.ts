import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVideoAssetState,
  PortfolioVisibilityStatus,
  PrismaClient,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';

/**
 * Move genuinely-withdrawn profiles the 19 Sept backfill missed into the
 * WITHDRAWN stage, WITHOUT sweeping in creators who never withdrew.
 *
 * The candidate shape — approval PENDING, profile incomplete and unlisted, but
 * `goLivePoliciesAcceptedAt` set — used to mean "withdrawn before the WITHDRAWN
 * stage existed", and `20260919120100_backfill_creator_withdrawn` converted
 * every such row. Two groups can still be sitting in it today, and they need
 * opposite treatment:
 *
 *   A. A real withdrawal the backfill could not see. It was SHORTLISTED when
 *      the backfill ran (which matched only PENDING), and
 *      `20260924120000_drop_creator_shortlist_stage` flushed it to PENDING five
 *      days later. It belongs in the Withdrawn tab.
 *
 *   B. A creator who never withdrew at all. Their Go Live was rejected by the
 *      server's checklist, but `goLivePoliciesAcceptedAt` had already been
 *      stamped and the request still returned 200 — so the stamp landed while
 *      the approval row never moved. They belong exactly where they are, in
 *      Building profile. Marking them WITHDRAWN would tell an admin they pulled
 *      back a submission they never made, and start a "resubmit your profile"
 *      drip for a profile that was never submitted.
 *
 * Only the approval row can tell them apart, and only in one direction. Any
 * real submission leaves a timestamp behind — `approvedAt` from the completion
 * flip into Self complete, `sentForReviewById` from an admin, or an existing
 * `withdrawnAt` — and group B has none of the three, because nothing ever acted
 * on their approval row. So evidence-bearing rows are converted and the rest
 * are only reported.
 *
 * The live Go-Live checklist is NOT used to classify, though it is reported for
 * context. It cannot separate the groups: a group-B creator whose blocking item
 * has since resolved (an Instagram mirror that finished, a reconnected account)
 * passes it today despite never having submitted.
 *
 * DRY RUN BY DEFAULT: without --apply nothing is written.
 *
 * Usage (from server/):
 *   # see the split first — writes nothing, sends nothing
 *   npm run prisma:backfill:withdrawn-stage
 *   # convert the rows with evidence of a real submission
 *   npm run prisma:backfill:withdrawn-stage -- --apply
 *
 * Flags:
 *   --apply              perform the writes (otherwise dry run)
 *   --include-unproven   also convert candidates with no evidence of a prior
 *                        submission. Only after reading the dry-run listing and
 *                        confirming those creators really did withdraw — this
 *                        is the flag that would mis-file a failed Go Live.
 *   --send-reminders     leave the resubmit-reminder stamps null, so the drip
 *                        emails/WhatsApps these creators. Off by default: these
 *                        withdrawals are days or weeks old, and the backstop
 *                        sweep would otherwise fire at everything converted
 *                        inside its 10-day window the moment this runs.
 *   --limit=N            process at most N candidates (default: all)
 *
 * The Go-Live rule is INLINED (no import from `src/`) so the script can run in
 * the production container, which ships only `dist/`. It mirrors
 * `evaluateProfileCompleteness`; it is reporting-only here, so drift changes
 * the printed context, never which rows are written.
 *
 * Idempotent: converted rows are no longer PENDING, so a second run matches
 * nothing new.
 */

const prisma = new PrismaClient();

const MIN_PORTFOLIO_VIDEOS = 3;
const REQUIRED_SECONDARY_NICHES = 2;
const REQUIRED_FACET_DIMENSIONS: CreatorFacetDimension[] = [
  CreatorFacetDimension.CREATOR_TYPE,
  CreatorFacetDimension.OCCUPATION,
  CreatorFacetDimension.APPEARANCE,
];
const PLAYABLE_ASSET_STATES: PortfolioVideoAssetState[] = [
  PortfolioVideoAssetState.READY,
  PortfolioVideoAssetState.LINK_ONLY,
];

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function numericFlag(name: string): number | undefined {
  const raw = process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split('=')[1];
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a positive number, got "${raw}"`);
  }
  return Math.floor(parsed);
}

function dbFingerprint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL=<missing>';
  try {
    const u = new URL(url);
    return `host=${u.host} db=${u.pathname.replace(/^\//, '') || '<no-db>'}`;
  } catch {
    return 'DATABASE_URL=<unparseable>';
  }
}

function day(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : '—';
}

type Candidate = {
  id: string;
  displayName: string | null;
  createdAt: Date;
  /** Evidence that this approval row was acted on by a real submission. */
  submittedBefore: boolean;
  evidence: string;
  /** Best available "when did they withdraw", mirroring the 19 Sept migration. */
  withdrawnAt: Date;
  /** Reporting only — never decides whether a row is converted. */
  checklistComplete: boolean;
  missing: string[];
};

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const includeUnproven = process.argv.includes('--include-unproven');
  const sendReminders = process.argv.includes('--send-reminders');
  const limit = numericFlag('limit');

  const profiles = await prisma.creatorProfile.findMany({
    where: {
      completeProfile: false,
      isListed: false,
      goLivePoliciesAcceptedAt: { not: null },
      creatorApproval: { status: ApprovalStatus.PENDING },
    },
    select: {
      id: true,
      displayName: true,
      createdAt: true,
      profileImageUrl: true,
      contactEmail: true,
      bio: true,
      countryName: true,
      stateName: true,
      city: true,
      gender: true,
      dateOfBirth: true,
      shippingAddress: true,
      creatorApproval: {
        select: {
          approvedAt: true,
          withdrawnAt: true,
          sentForReviewById: true,
          updatedAt: true,
        },
      },
      facetSelections: {
        select: { rank: true, option: { select: { dimension: true } } },
      },
      addOns: { select: { name: true } },
      _count: { select: { profileLanguages: true, packages: true } },
    },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  });

  const mandatoryOptions = await prisma.creatorAddOnOption.findMany({
    where: { mandatory: true },
    select: { name: true },
  });
  const mandatoryAddOnNames = mandatoryOptions.map((o) => o.name);

  const candidates: Candidate[] = [];

  for (const profile of profiles) {
    const approval = profile.creatorApproval;
    if (!approval) continue;

    const publicVideoCount = await prisma.creatorPortfolioVideo.count({
      where: {
        creatorId: profile.id,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        assetState: { in: PLAYABLE_ASSET_STATES },
      },
    });
    const instagramConnectionCount = await prisma.socialConnection.count({
      where: {
        creatorProfileId: profile.id,
        platform: SocialPlatform.INSTAGRAM,
        status: SocialConnectionStatus.ACTIVE,
      },
    });

    const selectedDimensions = new Set(
      profile.facetSelections.map((s) => s.option.dimension),
    );
    const nichePrimaryCount = profile.facetSelections.filter(
      (s) =>
        s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
        s.rank === 0,
    ).length;
    const nicheSecondaryCount = profile.facetSelections.filter(
      (s) =>
        s.option.dimension === CreatorFacetDimension.CONTENT_CATEGORY &&
        s.rank > 0,
    ).length;

    const missing: string[] = [];
    if (!hasText(profile.profileImageUrl)) missing.push('Profile photo');
    if (!hasText(profile.displayName)) missing.push('Display name');
    if (!hasText(profile.contactEmail)) missing.push('Contact email');
    if (!hasText(profile.bio)) missing.push('Bio');
    if (!hasText(profile.countryName)) missing.push('Country');
    if (!hasText(profile.stateName)) missing.push('State');
    if (!hasText(profile.city)) missing.push('City');
    if (!profile.gender) missing.push('Gender');
    if (!profile.dateOfBirth) missing.push('Date of birth');
    if (!hasText(profile.shippingAddress)) missing.push('Shipping address');
    if (nichePrimaryCount < 1) missing.push('Primary niche');
    if (nicheSecondaryCount < REQUIRED_SECONDARY_NICHES) {
      missing.push(`${REQUIRED_SECONDARY_NICHES} secondary niches`);
    }
    for (const dimension of REQUIRED_FACET_DIMENSIONS) {
      if (!selectedDimensions.has(dimension)) missing.push(dimension);
    }
    if (profile._count.profileLanguages < 1) {
      missing.push('At least one language');
    }
    if (profile._count.packages < 1) missing.push('At least one package');
    if (
      !mandatoryAddOnNames.every((name) =>
        profile.addOns.some((addOn) => addOn.name === name),
      )
    ) {
      missing.push('Priced mandatory add-ons');
    }
    if (publicVideoCount < MIN_PORTFOLIO_VIDEOS) {
      missing.push(
        `At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos (has ${publicVideoCount} playable)`,
      );
    }
    if (instagramConnectionCount < 1) missing.push('Instagram connected');

    // Any of the three proves the approval row was acted on by a real
    // submission, which a failed Go Live never does.
    const evidenceParts: string[] = [];
    if (approval.withdrawnAt) evidenceParts.push('withdrawnAt');
    if (approval.approvedAt) evidenceParts.push('approvedAt');
    if (approval.sentForReviewById) evidenceParts.push('sentForReview');

    candidates.push({
      id: profile.id,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
      submittedBefore: evidenceParts.length > 0,
      evidence: evidenceParts.join('+') || 'none',
      // Mirrors the 19 Sept migration: the withdraw was the last thing to touch
      // the approval row, so its updatedAt is the best proxy available.
      withdrawnAt: approval.withdrawnAt ?? approval.updatedAt,
      checklistComplete: missing.length === 0,
      missing,
    });
  }

  const proven = candidates.filter((c) => c.submittedBefore);
  const unproven = candidates.filter((c) => !c.submittedBefore);

  console.log(
    `[backfill] ${candidates.length} candidate(s): ${proven.length} with ` +
      `evidence of a real submission, ${unproven.length} without. (${dbFingerprint()})`,
  );

  console.log(
    `\n[backfill] WITHDRAWN — converted${apply ? '' : ' on --apply'}:`,
  );
  for (const c of proven) {
    console.log(
      `  ${c.id} ${c.displayName ?? '<no name>'} — evidence=${c.evidence} ` +
        `withdrawnAt=${day(c.withdrawnAt)} checklistPassesNow=${c.checklistComplete}`,
    );
  }
  if (proven.length === 0) console.log('  (none)');

  console.log(
    `\n[backfill] LEFT IN BUILDING PROFILE — no evidence they ever submitted.` +
      ` These look like Go Lives the checklist rejected, not withdrawals:`,
  );
  for (const c of unproven) {
    console.log(
      `  ${c.id} ${c.displayName ?? '<no name>'} — registered ${day(c.createdAt)} ` +
        `checklistPassesNow=${c.checklistComplete}` +
        (c.missing.length > 0 ? ` missing=[${c.missing.join(', ')}]` : ''),
    );
  }
  if (unproven.length === 0) console.log('  (none)');

  const toConvert = includeUnproven ? candidates : proven;

  if (!apply) {
    console.log(
      `\n[backfill] DRY RUN — nothing written. Re-run with --apply to convert ` +
        `${toConvert.length} row(s)` +
        (includeUnproven ? ' (--include-unproven is set).' : '.'),
    );
    return;
  }

  // Pre-stamping the reminder columns retires the drip for these rows. The
  // backstop sweep fires at any WITHDRAWN row whose withdrawnAt falls inside
  // its 10-day window with an unsent stage, so without this every conversion
  // recent enough to qualify would send a "resubmit your profile" email and
  // WhatsApp the moment this script lands.
  const retiredAt = sendReminders ? null : new Date();

  let converted = 0;
  for (const c of toConvert) {
    const res = await prisma.creatorApproval.updateMany({
      // Re-assert PENDING so a row that moved since the read is left alone.
      where: { creatorId: c.id, status: ApprovalStatus.PENDING },
      data: {
        status: ApprovalStatus.WITHDRAWN,
        withdrawnAt: c.withdrawnAt,
        sentForReviewById: null,
        rejectionReason: null,
        resubmitReminder30mAt: retiredAt,
        resubmitReminder24hAt: retiredAt,
        resubmitReminder48hAt: retiredAt,
      },
    });
    converted += res.count;
  }

  console.log(
    `\n[backfill] Converted ${converted} row(s) to WITHDRAWN. ` +
      `Resubmit reminders ${sendReminders ? 'LEFT ARMED — the drip will send' : 'retired (use --send-reminders to send them)'}. ` +
      `(${dbFingerprint()})`,
  );
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
