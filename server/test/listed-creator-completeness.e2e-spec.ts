import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import {
  ApprovalStatus,
  CreatorFacetDimension,
  CreatorGender,
  PortfolioVideoAssetState,
  PortfolioVisibilityStatus,
  PrismaClient,
  RoleName,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AuthService } from '../src/auth/auth.service';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../src/auth/guards/super-admin.guard';
import { AdminCreatorController } from '../src/creator-profile/admin-creator.controller';
import { CreatorProfileService } from '../src/creator-profile/creator-profile.service';
import { CreatorPayoutDetailsService } from '../src/creator-profile/creator-payout-details.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * End-to-end cover for splitting LISTED creators by whether their profile is
 * actually finished.
 *
 * The split cannot be a stored flag: `completeProfile` is a one-way latch
 * stamped at Go Live, and the intro video is not even part of the Go-Live
 * checklist — creators are asked for it only after they are listed. So every
 * listed creator carries `completeProfile = true` while many are still missing
 * something. These tests seed exactly that situation and assert the server
 * re-derives the truth.
 *
 * Requires a Postgres reachable at DATABASE_URL with migrations applied.
 */
const ACCESS_SECRET = 'e2e-access-secret-0123456789';

type CountsBody = Record<string, number>;
type ListBody = {
  items: Array<{
    id: string;
    displayName: string;
    missingRequirements?: string[];
  }>;
  total: number;
};

/** Stable 8 digits from a handle, so every seeded phone is unique. */
function handleDigits(handle: string): string {
  let hash = 0;
  for (const char of handle)
    hash = (hash * 31 + char.charCodeAt(0)) % 100000000;
  return String(hash).padStart(8, '0');
}

const prisma = new PrismaClient();

const config = {
  get: (k: string, d?: string) =>
    ({
      JWT_ACCESS_SECRET: ACCESS_SECRET,
      JWT_REFRESH_SECRET: 'e2e-refresh-secret-0123456789',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    })[k] ?? d,
};

describe('Listed creators split by profile completeness (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let adminId: string;
  let creatorRoleId: string;

  const asAdmin = () => ({
    Authorization: `Bearer ${jwt.sign(
      { sub: adminId },
      { secret: ACCESS_SECRET, expiresIn: '15m' },
    )}`,
  });

  const listSegment = (segment: string, query: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .get('/admin/creators')
      .query({ segment, ...query })
      .set(asAdmin());

  const names = (body: ListBody) => body.items.map((i) => i.displayName).sort();

  /**
   * A LISTED creator. `gaps` removes requirements after listing — exactly what
   * happens in production, where the latch was stamped when the profile was
   * whole (or under an older checklist).
   */
  async function seedListedCreator(
    handle: string,
    gaps: {
      introVideo?: boolean;
      instagram?: boolean;
      portfolioVideos?: boolean;
      language?: boolean;
      primaryNiche?: boolean;
      secondaryNiches?: boolean;
      /** `null` seeds a creator with no phone on file. */
      phone?: string | null;
    } = {},
  ) {
    const user = await prisma.user.create({
      data: {
        email: `${handle}@creator.test`,
        name: handle,
        primaryRoleId: creatorRoleId,
        phone:
          gaps.phone === null
            ? null
            : (gaps.phone ?? `+9199${handleDigits(handle)}`),
        phoneVerified: gaps.phone !== null,
      },
    });
    const profile = await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        displayName: handle,
        publicSlug: handle,
        profileImageUrl: 'https://cdn.example/p.jpg',
        // The post-listing requirement: absent unless the creator uploaded one.
        introVideoUrl: gaps.introVideo
          ? null
          : `https://cdn.example/${handle}-intro.mp4`,
        contactEmail: `${handle}@creator.test`,
        bio: 'Short-form skincare and beauty content.',
        countryName: 'India',
        stateName: 'Karnataka',
        city: 'Bengaluru',
        gender: CreatorGender.FEMALE,
        dateOfBirth: new Date('1996-04-01'),
        shippingAddress: '1 Main Street, Bengaluru',
        // Listed: the latch says complete, whatever the gaps below say.
        completeProfile: true,
        isListed: true,
      },
    });

    await prisma.creatorApproval.create({
      data: {
        creatorId: profile.id,
        status: ApprovalStatus.APPROVED,
        approvedAt: new Date(),
      },
    });

    const option = (dimension: CreatorFacetDimension, slug: string) =>
      prisma.creatorFacetOption.create({
        data: {
          dimension,
          slug: `${handle}-${slug}`,
          label: slug,
          sortOrder: 0,
        },
      });

    const [primary, second1, second2, type, occupation, appearance, language] =
      await Promise.all([
        option(CreatorFacetDimension.CONTENT_CATEGORY, 'n1'),
        option(CreatorFacetDimension.CONTENT_CATEGORY, 'n2'),
        option(CreatorFacetDimension.CONTENT_CATEGORY, 'n3'),
        option(CreatorFacetDimension.CREATOR_TYPE, 'type'),
        option(CreatorFacetDimension.OCCUPATION, 'occ'),
        option(CreatorFacetDimension.APPEARANCE, 'look'),
        option(CreatorFacetDimension.LANGUAGE, 'lang'),
      ]);

    // The niche is the one facet stored as ranks rather than dimensions:
    // rank 0 is the primary category, rank > 0 the secondary ones.
    await prisma.creatorProfileFacetSelection.createMany({
      data: [
        ...(gaps.primaryNiche
          ? []
          : [{ creatorProfileId: profile.id, optionId: primary.id, rank: 0 }]),
        ...(gaps.secondaryNiches
          ? []
          : [
              { creatorProfileId: profile.id, optionId: second1.id, rank: 1 },
              { creatorProfileId: profile.id, optionId: second2.id, rank: 2 },
            ]),
        { creatorProfileId: profile.id, optionId: type.id, rank: 0 },
        { creatorProfileId: profile.id, optionId: occupation.id, rank: 0 },
        { creatorProfileId: profile.id, optionId: appearance.id, rank: 0 },
      ],
    });

    if (!gaps.language) {
      await prisma.creatorProfileLanguage.create({
        data: { creatorProfileId: profile.id, optionId: language.id },
      });
    }

    await prisma.creatorPackage.create({
      data: {
        creatorId: profile.id,
        name: 'Starter',
        deliverables: [],
        priceAmount: 1500,
        deliveryDays: 5,
      },
    });

    if (!gaps.portfolioVideos) {
      await prisma.creatorPortfolioVideo.createMany({
        data: [1, 2, 3].map((n) => ({
          creatorId: profile.id,
          videoUrl: `https://cdn.example/${handle}-${n}.mp4`,
          visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
          assetState: PortfolioVideoAssetState.READY,
        })),
      });
    }

    if (!gaps.instagram) {
      await prisma.socialConnection.create({
        data: {
          creatorProfileId: profile.id,
          platform: SocialPlatform.INSTAGRAM,
          providerAccountId: `ig-${handle}`,
          accessToken: 'token',
          status: SocialConnectionStatus.ACTIVE,
          followersCount: 12400,
        },
      });
    }

    return profile;
  }

  beforeAll(async () => {
    process.env.CREATOR_ONBOARDING_MODE = 'profile_first';
    jwt = new JwtService({ secret: ACCESS_SECRET });

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminCreatorController],
      providers: [
        AdminGuard,
        SuperAdminGuard,
        JwtAuthGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: CreatorPayoutDetailsService, useValue: {} },
        {
          provide: CreatorProfileService,
          useFactory: (p: PrismaService) =>
            new CreatorProfileService(
              p,
              {} as never,
              {} as never,
              { notifyApproved: () => undefined } as never,
              {} as never,
              { enabled: false } as never,
              {} as never,
              {} as never,
              {} as never,
              {} as never,
              {} as never,
            ),
          inject: [PrismaService],
        },
        {
          provide: AuthService,
          useFactory: (p: PrismaService, j: JwtService) =>
            new AuthService(p, j, config as never, {} as never, {} as never),
          inject: [PrismaService, JwtService],
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "User" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "Role" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "CreatorFacetOption" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "CreatorAddOnOption" CASCADE');

    const adminRole = await prisma.role.create({
      data: { name: RoleName.ADMIN },
    });
    creatorRoleId = (
      await prisma.role.create({ data: { name: RoleName.CREATOR } })
    ).id;
    adminId = (
      await prisma.user.create({
        data: {
          email: 'admin@gocollab.io',
          name: 'Bipasha Roy',
          primaryRoleId: adminRole.id,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  describe('the split', () => {
    beforeEach(async () => {
      await seedListedCreator('whole');
      await seedListedCreator('needs-intro', { introVideo: true });
      await seedListedCreator('needs-several', {
        introVideo: true,
        instagram: true,
        portfolioVideos: true,
      });
    });

    it('puts only the genuinely finished profile in listed · complete', async () => {
      const res = await listSegment('listed_complete').expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['whole']);
      expect(body.total).toBe(1);
      expect(body.items[0]?.missingRequirements).toEqual([]);
    });

    it('collects everyone still owing something in listed · incomplete', async () => {
      const res = await listSegment('listed_incomplete').expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['needs-intro', 'needs-several']);
      expect(body.total).toBe(2);
    });

    it('leaves the plain Listed tab showing every listed creator', async () => {
      const res = await listSegment('listed').expect(200);
      expect((res.body as ListBody).total).toBe(3);
    });

    it('reports exactly what each creator is missing', async () => {
      const res = await listSegment('listed_incomplete').expect(200);
      const byName = new Map(
        (res.body as ListBody).items.map((i) => [
          i.displayName,
          i.missingRequirements ?? [],
        ]),
      );

      // The designed post-listing gap, and nothing else.
      expect(byName.get('needs-intro')).toEqual(['Intro video']);

      expect(byName.get('needs-several')).toEqual(
        expect.arrayContaining([
          'At least 3 portfolio videos',
          'Instagram connected',
          'Intro video',
        ]),
      );
    });

    it('counts both segments, and they add up to Listed', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/creators/segment-counts')
        .set(asAdmin())
        .expect(200);
      const body = res.body as CountsBody;

      expect(body.listedComplete).toBe(1);
      expect(body.listedIncomplete).toBe(2);
      expect(body.listedComplete + body.listedIncomplete).toBe(body.listed);
    });

    it('narrows the derived segment by search', async () => {
      const res = await listSegment('listed_incomplete', {
        search: 'needs-intro',
      }).expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['needs-intro']);
      expect(body.total).toBe(1);
    });
  });

  describe('a listed creator is never judged by the stored latch', () => {
    it('ignores completeProfile = true when requirements are actually missing', async () => {
      const creator = await seedListedCreator('latched', {
        introVideo: true,
        language: true,
      });

      // Precondition: the database insists this profile is complete.
      const stored = await prisma.creatorProfile.findUnique({
        where: { id: creator.id },
        select: { completeProfile: true, isListed: true },
      });
      expect(stored).toEqual({ completeProfile: true, isListed: true });

      const res = await listSegment('listed_incomplete').expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['latched']);
      expect(body.items[0]?.missingRequirements).toEqual(
        expect.arrayContaining(['At least one language', 'Intro video']),
      );
    });

    it('counts a missing primary category against a listed creator', async () => {
      await seedListedCreator('no-primary', { primaryNiche: true });

      const res = await listSegment('listed_incomplete').expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['no-primary']);
      expect(body.items[0]?.missingRequirements).toEqual(['Primary niche']);
    });

    it('counts missing secondary niches against a listed creator', async () => {
      await seedListedCreator('no-secondaries', { secondaryNiches: true });

      const res = await listSegment('listed_incomplete').expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['no-secondaries']);
      expect(body.items[0]?.missingRequirements).toEqual([
        '2 secondary niches',
      ]);
    });

    it('requires the full number of secondary niches, not just one', async () => {
      // One secondary pick is still short of the two the checklist demands —
      // the case a `some`-style relation filter would wrongly pass.
      const creator = await seedListedCreator('one-secondary', {
        secondaryNiches: true,
      });
      const lone = await prisma.creatorFacetOption.create({
        data: {
          dimension: CreatorFacetDimension.CONTENT_CATEGORY,
          slug: 'one-secondary-lone',
          label: 'lone',
          sortOrder: 0,
        },
      });
      await prisma.creatorProfileFacetSelection.create({
        data: { creatorProfileId: creator.id, optionId: lone.id, rank: 1 },
      });

      const res = await listSegment('listed_incomplete').expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['one-secondary']);
      expect(body.items[0]?.missingRequirements).toEqual([
        '2 secondary niches',
      ]);
    });

    it('counts both niche gaps together', async () => {
      await seedListedCreator('no-niche-at-all', {
        primaryNiche: true,
        secondaryNiches: true,
      });

      const res = await listSegment('listed_incomplete').expect(200);
      const body = res.body as ListBody;
      expect(body.items[0]?.missingRequirements).toEqual([
        'Primary niche',
        '2 secondary niches',
      ]);
    });

    it('counts an unpriced mandatory add-on against a listed creator', async () => {
      await prisma.creatorAddOnOption.create({
        data: {
          slug: 'raw-footage',
          name: 'Raw footage',
          sortOrder: 0,
          mandatory: true,
        },
      });
      await seedListedCreator('unpriced-addon');

      const res = await listSegment('listed_incomplete').expect(200);
      const body = res.body as ListBody;
      expect(names(body)).toEqual(['unpriced-addon']);
      expect(body.items[0]?.missingRequirements).toEqual([
        'Priced mandatory add-ons',
      ]);
    });
  });

  describe('pagination over the derived segment', () => {
    it('pages without losing or repeating anyone', async () => {
      for (const n of [1, 2, 3, 4, 5]) {
        await seedListedCreator(`incomplete-${n}`, { introVideo: true });
      }

      const first = await listSegment('listed_incomplete', {
        page: 1,
        limit: 2,
      }).expect(200);
      const second = await listSegment('listed_incomplete', {
        page: 2,
        limit: 2,
      }).expect(200);
      const third = await listSegment('listed_incomplete', {
        page: 3,
        limit: 2,
      }).expect(200);

      for (const res of [first, second, third]) {
        expect((res.body as ListBody).total).toBe(5);
      }
      expect((first.body as ListBody).items).toHaveLength(2);
      expect((second.body as ListBody).items).toHaveLength(2);
      expect((third.body as ListBody).items).toHaveLength(1);

      const seen = [first, second, third].flatMap((res) =>
        (res.body as ListBody).items.map((i) => i.id),
      );
      expect(new Set(seen).size).toBe(5);
    });

    it('returns an empty page past the end rather than erroring', async () => {
      await seedListedCreator('only-one', { introVideo: true });

      const res = await listSegment('listed_incomplete', {
        page: 9,
        limit: 20,
      }).expect(200);
      const body = res.body as ListBody;
      expect(body.items).toEqual([]);
      expect(body.total).toBe(1);
    });
  });

  describe('the outreach cohort (listListedCreatorsWithIncompleteProfiles)', () => {
    const cohort = () =>
      app.get(CreatorProfileService).listListedCreatorsWithIncompleteProfiles();

    it('returns only the incomplete creators, with contact details', async () => {
      await seedListedCreator('whole');
      await seedListedCreator('needs-intro', { introVideo: true });

      const rows = await cohort();

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        displayName: 'needs-intro',
        phoneVerified: true,
        contactEmail: 'needs-intro@creator.test',
        missing: ['Intro video'],
      });
      expect(rows[0]?.phone).toMatch(/^\+9199\d{8}$/);
      expect(rows[0]?.userId).toEqual(expect.any(String));
    });

    it('still returns a creator with no phone on file, flagged as unverified', async () => {
      // The sender decides what to do about a missing number; dropping them
      // here would hide the gap from whoever is chasing the cohort.
      await seedListedCreator('no-phone', { introVideo: true, phone: null });

      const rows = await cohort();

      expect(rows).toHaveLength(1);
      expect(rows[0]?.phone).toBeNull();
      expect(rows[0]?.phoneVerified).toBe(false);
    });

    it('names every outstanding requirement, not just the first', async () => {
      await seedListedCreator('several', {
        introVideo: true,
        instagram: true,
        primaryNiche: true,
      });

      const [row] = await cohort();

      expect(row?.missing).toEqual(
        expect.arrayContaining([
          'Primary niche',
          'Instagram connected',
          'Intro video',
        ]),
      );
    });

    it('agrees exactly with the admin listed · incomplete tab', async () => {
      await seedListedCreator('whole');
      await seedListedCreator('gap-a', { introVideo: true });
      await seedListedCreator('gap-b', { language: true });

      const rows = await cohort();
      const tab = await listSegment('listed_incomplete').expect(200);

      expect(rows.map((r) => r.creatorProfileId).sort()).toEqual(
        (tab.body as ListBody).items.map((i) => i.id).sort(),
      );
    });

    it('is empty when every listed profile is finished', async () => {
      await seedListedCreator('whole');

      await expect(cohort()).resolves.toEqual([]);
    });

    it('never includes a creator who is not listed', async () => {
      const unlisted = await seedListedCreator('not-listed', {
        introVideo: true,
      });
      await prisma.creatorProfile.update({
        where: { id: unlisted.id },
        data: { isListed: false },
      });

      await expect(cohort()).resolves.toEqual([]);
    });
  });

  it('reports zeroes rather than failing when nothing is listed', async () => {
    const list = await listSegment('listed_incomplete').expect(200);
    expect((list.body as ListBody).total).toBe(0);

    const counts = await request(app.getHttpServer())
      .get('/admin/creators/segment-counts')
      .set(asAdmin())
      .expect(200);
    expect((counts.body as CountsBody).listedComplete).toBe(0);
    expect((counts.body as CountsBody).listedIncomplete).toBe(0);
  });
});
