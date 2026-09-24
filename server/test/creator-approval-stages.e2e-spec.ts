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
import { recomputeCreatorListingState } from '../src/creator-profile/creator-listing-state.util';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * End-to-end cover for the creator approval stages after the Shortlisted stage
 * was removed. The flow every creator now takes is:
 *
 *   Building profile → Self complete → Awaiting review → Listed
 *
 * Runs the real AdminCreatorController behind the real guards against a real
 * database, so routing, validation and the SQL behind each segment are covered
 * together. The two shortlist routes are asserted gone, and a Go Live is driven
 * through `recomputeCreatorListingState` — the single source of truth the
 * profile-write paths call — so the completion transition is exercised for real
 * rather than stubbed.
 *
 * Requires a Postgres reachable at DATABASE_URL with migrations applied.
 */
const ACCESS_SECRET = 'e2e-access-secret-0123456789';

type SegmentCountsBody = Record<string, number>;
type ListBody = {
  items: Array<{ id: string; approvalStatus: ApprovalStatus }>;
  total: number;
};

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

describe('Creator approval stages without the shortlist (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;

  let adminId: string;
  let creatorRoleId: string;

  const tokenFor = (userId: string) =>
    jwt.sign({ sub: userId }, { secret: ACCESS_SECRET, expiresIn: '15m' });

  const asAdmin = () => ({ Authorization: `Bearer ${tokenFor(adminId)}` });

  /** A creator profile that meets every Go-Live requirement but has not gone live. */
  async function seedBuildingProfile(handle: string) {
    const user = await prisma.user.create({
      data: {
        email: `${handle}@creator.test`,
        name: handle,
        primaryRoleId: creatorRoleId,
      },
    });
    const profile = await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        displayName: handle,
        publicSlug: handle,
        profileImageUrl: 'https://cdn.example/p.jpg',
        contactEmail: `${handle}@creator.test`,
        bio: 'Short-form skincare and beauty content.',
        countryName: 'India',
        stateName: 'Karnataka',
        city: 'Bengaluru',
        gender: CreatorGender.FEMALE,
        dateOfBirth: new Date('1996-04-01'),
        shippingAddress: '1 Main Street, Bengaluru',
        completeProfile: false,
        isListed: false,
      },
    });

    const option = async (dimension: CreatorFacetDimension, slug: string) =>
      prisma.creatorFacetOption.create({
        data: { dimension, slug: `${handle}-${slug}`, label: slug, sortOrder: 0 },
      });

    const [primary, secondary1, secondary2, type, occupation, appearance, language] =
      await Promise.all([
        option(CreatorFacetDimension.CONTENT_CATEGORY, 'niche-primary'),
        option(CreatorFacetDimension.CONTENT_CATEGORY, 'niche-secondary-1'),
        option(CreatorFacetDimension.CONTENT_CATEGORY, 'niche-secondary-2'),
        option(CreatorFacetDimension.CREATOR_TYPE, 'type'),
        option(CreatorFacetDimension.OCCUPATION, 'occupation'),
        option(CreatorFacetDimension.APPEARANCE, 'appearance'),
        option(CreatorFacetDimension.LANGUAGE, 'language'),
      ]);

    await prisma.creatorProfileFacetSelection.createMany({
      data: [
        { creatorProfileId: profile.id, optionId: primary.id, rank: 0 },
        { creatorProfileId: profile.id, optionId: secondary1.id, rank: 1 },
        { creatorProfileId: profile.id, optionId: secondary2.id, rank: 2 },
        { creatorProfileId: profile.id, optionId: type.id, rank: 0 },
        { creatorProfileId: profile.id, optionId: occupation.id, rank: 0 },
        { creatorProfileId: profile.id, optionId: appearance.id, rank: 0 },
      ],
    });
    await prisma.creatorProfileLanguage.create({
      data: { creatorProfileId: profile.id, optionId: language.id },
    });
    await prisma.creatorPackage.create({
      data: {
        creatorId: profile.id,
        name: 'Starter',
        deliverables: [],
        priceAmount: 1500,
        deliveryDays: 5,
      },
    });
    await prisma.creatorPortfolioVideo.createMany({
      data: [1, 2, 3].map((n) => ({
        creatorId: profile.id,
        videoUrl: `https://cdn.example/${handle}-${n}.mp4`,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        assetState: PortfolioVideoAssetState.READY,
      })),
    });
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
    return profile;
  }

  const approvalStatusOf = async (creatorId: string) =>
    (
      await prisma.creatorApproval.findUnique({
        where: { creatorId },
        select: { status: true },
      })
    )?.status;

  const listSegment = (segment: string) =>
    request(app.getHttpServer())
      .get('/admin/creators')
      .query({ segment })
      .set(asAdmin());

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
            // Only the admin list / approve paths are exercised, so the
            // collaborators those never reach are left unimplemented.
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

    const adminRole = await prisma.role.create({ data: { name: RoleName.ADMIN } });
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

  describe('the shortlist is gone', () => {
    it('no longer exposes the shortlist route', async () => {
      const creator = await seedBuildingProfile('gone-shortlist');
      await request(app.getHttpServer())
        .patch(`/admin/creators/${creator.id}/shortlist`)
        .set(asAdmin())
        .expect(404);
    });

    it('no longer exposes the unshortlist route', async () => {
      const creator = await seedBuildingProfile('gone-unshortlist');
      await request(app.getHttpServer())
        .patch(`/admin/creators/${creator.id}/unshortlist`)
        .set(asAdmin())
        .expect(404);
    });

    it('rejects the shortlisted segment on the admin list', async () => {
      await listSegment('shortlisted').expect(400);
    });

    it('reports no shortlisted count', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/creators/segment-counts')
        .set(asAdmin())
        .expect(200);
      const body = res.body as SegmentCountsBody;
      expect(body).not.toHaveProperty('shortlisted');
      // Every stage that remains must still be reported. Deliberately a subset
      // check, not exact equality on the key set: new segments get added (the
      // listed-completeness split already did), and that is not this test's
      // business — its job is that `shortlisted` is gone.
      expect(Object.keys(body)).toEqual(
        expect.arrayContaining([
          'pending',
          'incomplete',
          'selfCompleted',
          'withdrawn',
          'listed',
        ]),
      );
    });
  });

  describe('Building profile → Self complete → Awaiting review → Listed', () => {
    it('walks a creator through every stage', async () => {
      const creator = await seedBuildingProfile('walks-the-flow');
      await prisma.creatorApproval.create({
        data: { creatorId: creator.id, status: ApprovalStatus.PENDING },
      });

      // Building profile.
      const building = await listSegment('incomplete').expect(200);
      expect((building.body as ListBody).items.map((i) => i.id)).toEqual([
        creator.id,
      ]);

      // Go Live → Self complete (never straight into Awaiting review).
      const state = await recomputeCreatorListingState(prisma, creator.id, true);
      expect(state?.completeProfile).toBe(true);
      expect(state?.isListed).toBe(false);
      expect(await approvalStatusOf(creator.id)).toBe(
        ApprovalStatus.SELF_COMPLETED,
      );

      const selfComplete = await listSegment('self_completed').expect(200);
      expect((selfComplete.body as ListBody).items.map((i) => i.id)).toEqual([
        creator.id,
      ]);
      expect((await listSegment('incomplete').expect(200)).body).toMatchObject({
        total: 0,
      });

      // A self complete profile cannot be listed without a review first.
      await request(app.getHttpServer())
        .patch(`/admin/creators/${creator.id}/approve`)
        .set(asAdmin())
        .expect(400);

      // Send for review → Awaiting review.
      await request(app.getHttpServer())
        .patch(`/admin/creators/${creator.id}/send-for-review`)
        .set(asAdmin())
        .expect(200);
      expect(await approvalStatusOf(creator.id)).toBe(ApprovalStatus.PENDING);
      const awaiting = await listSegment('pending').expect(200);
      expect((awaiting.body as ListBody).items.map((i) => i.id)).toEqual([
        creator.id,
      ]);

      // List → Listed.
      await request(app.getHttpServer())
        .patch(`/admin/creators/${creator.id}/approve`)
        .set(asAdmin())
        .expect(200);
      expect(await approvalStatusOf(creator.id)).toBe(ApprovalStatus.APPROVED);
      const listed = await listSegment('listed').expect(200);
      expect((listed.body as ListBody).items.map((i) => i.id)).toEqual([
        creator.id,
      ]);
    });

    it('sends a withdrawn profile back to Self complete when it resubmits', async () => {
      const creator = await seedBuildingProfile('resubmits');
      await prisma.creatorApproval.create({
        data: {
          creatorId: creator.id,
          status: ApprovalStatus.WITHDRAWN,
          withdrawnAt: new Date(),
        },
      });

      await recomputeCreatorListingState(prisma, creator.id, true);

      expect(await approvalStatusOf(creator.id)).toBe(
        ApprovalStatus.SELF_COMPLETED,
      );
    });

    it('leaves an incomplete profile in Building profile on a draft save', async () => {
      const creator = await seedBuildingProfile('still-building');
      await prisma.creatorPortfolioVideo.deleteMany({
        where: { creatorId: creator.id },
      });
      await prisma.creatorApproval.create({
        data: { creatorId: creator.id, status: ApprovalStatus.PENDING },
      });

      const state = await recomputeCreatorListingState(prisma, creator.id, true);

      expect(state?.completeProfile).toBe(false);
      expect(await approvalStatusOf(creator.id)).toBe(ApprovalStatus.PENDING);
      expect((await listSegment('incomplete').expect(200)).body).toMatchObject({
        total: 1,
      });
    });
  });
});
