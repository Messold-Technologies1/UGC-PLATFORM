import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaClient, RoleName, UserStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AuthService } from '../src/auth/auth.service';
import { AdminGuard } from '../src/auth/guards/admin.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AdminBrandController } from '../src/brand-profile/admin-brand.controller';
import { BrandProfileService } from '../src/brand-profile/brand-profile.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * End-to-end cover for admin deactivate/activate of a brand user.
 *
 * Runs the real controller behind the real JwtAuthGuard and AdminGuard against
 * a real database, so the assertions cover routing, auth, the guards and the
 * SQL together — the layers a service-level unit test with a mocked Prisma
 * cannot reach.
 *
 * Requires a Postgres reachable at DATABASE_URL with migrations applied.
 */
const ACCESS_SECRET = 'e2e-access-secret-0123456789';

/** Response shapes, so assertions never walk an `any` body. */
type StatusBody = {
  userId: string;
  status: UserStatus;
  statusChangedAt: string | null;
};
type ErrorBody = { message: string | string[] };
type ListBody = {
  items: Array<Record<string, unknown> & { userId: string }>;
};
type DetailBody = Record<string, unknown>;
type WishlistsBody = { items: Array<{ name: string }> };

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

describe('Admin brand deactivate/activate (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let auth: AuthService;

  let adminId: string;
  let otherAdminId: string;
  let brandUserId: string;
  let brandProfileId: string;
  let creatorOnlyUserId: string;

  /** A signed access token for `userId`, exactly as JwtAuthGuard expects. */
  const tokenFor = (userId: string) =>
    jwt.sign({ sub: userId }, { secret: ACCESS_SECRET, expiresIn: '15m' });

  const asUser = (userId: string) => ({
    Authorization: `Bearer ${tokenFor(userId)}`,
  });

  beforeAll(async () => {
    jwt = new JwtService({ secret: ACCESS_SECRET });

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminBrandController],
      providers: [
        BrandProfileService,
        AdminGuard,
        JwtAuthGuard,
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        // Not exercised by these routes.
        { provide: 'StorageService', useValue: {} },
        { provide: 'BrandAccessService', useValue: {} },
        { provide: 'BrandProfileMailNotifier', useValue: {} },
        { provide: 'SignupRegistrationService', useValue: {} },
        { provide: 'PhoneVerificationService', useValue: {} },
      ],
    })
      .overrideProvider(BrandProfileService)
      .useFactory({
        factory: (p: PrismaService) =>
          new BrandProfileService(p, {} as never, {} as never, {} as never),
        inject: [PrismaService],
      })
      .overrideProvider(AuthService)
      .useFactory({
        factory: (p: PrismaService, j: JwtService) =>
          new AuthService(p, j, config as never, {} as never, {} as never),
        inject: [PrismaService, JwtService],
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    auth = moduleRef.get(AuthService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "User" CASCADE');
    await prisma.$executeRawUnsafe('TRUNCATE "Role" CASCADE');

    const adminRole = await prisma.role.create({
      data: { name: RoleName.ADMIN },
    });
    const brandRole = await prisma.role.create({
      data: { name: RoleName.BRAND },
    });
    const creatorRole = await prisma.role.create({
      data: { name: RoleName.CREATOR },
    });

    adminId = (
      await prisma.user.create({
        data: {
          email: 'admin@gocollab.io',
          name: 'Bipasha Roy',
          primaryRoleId: adminRole.id,
        },
      })
    ).id;

    otherAdminId = (
      await prisma.user.create({
        data: {
          email: 'admin2@gocollab.io',
          name: 'Anuj',
          primaryRoleId: adminRole.id,
        },
      })
    ).id;

    const brandUser = await prisma.user.create({
      data: {
        email: 'owner@acme.com',
        name: 'Acme Owner',
        primaryRoleId: brandRole.id,
        brandProfile: {
          create: {
            brandName: 'Acme Skincare',
            contactFullName: 'Jane Doe',
            contactPhone: '+91 98765 43210',
            contactEmail: 'jane@acme.com',
            website: 'https://acme.com',
          },
        },
      },
      include: { brandProfile: true },
    });
    brandUserId = brandUser.id;
    brandProfileId = brandUser.brandProfile!.id;

    await prisma.brandWishlist.create({
      data: { brandId: brandProfileId, name: 'Spring picks' },
    });

    creatorOnlyUserId = (
      await prisma.user.create({
        data: {
          email: 'creator@x.com',
          name: 'Creator',
          primaryRoleId: creatorRole.id,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  const deactivate = (actorId: string, targetId: string) =>
    request(app.getHttpServer())
      .patch(`/admin/brands/user/${targetId}/deactivate`)
      .set(asUser(actorId));

  const activate = (actorId: string, targetId: string) =>
    request(app.getHttpServer())
      .patch(`/admin/brands/user/${targetId}/activate`)
      .set(asUser(actorId));

  describe('authorization', () => {
    it('rejects an unauthenticated caller', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/brands/user/${brandUserId}/deactivate`)
        .expect(401);
    });

    it('rejects a non-admin caller', async () => {
      await deactivate(creatorOnlyUserId, brandUserId).expect(403);
    });

    it('rejects a garbled user id before touching the database', async () => {
      await request(app.getHttpServer())
        .patch('/admin/brands/user/not-a-uuid/deactivate')
        .set(asUser(adminId))
        .expect(400);
    });
  });

  describe('deactivating', () => {
    it('sets the account to DEACTIVATED and reports it back', async () => {
      const res = await deactivate(adminId, brandUserId).expect(200);
      const body = res.body as StatusBody;

      expect(body).toMatchObject({
        userId: brandUserId,
        status: UserStatus.DEACTIVATED,
      });
      expect(body.statusChangedAt).toBeTruthy();
    });

    it('records which admin did it', async () => {
      await deactivate(otherAdminId, brandUserId).expect(200);

      const row = await prisma.user.findUnique({
        where: { id: brandUserId },
        select: { statusChangedById: true, statusChangedAt: true },
      });
      expect(row?.statusChangedById).toBe(otherAdminId);
      expect(row?.statusChangedAt).toBeInstanceOf(Date);
    });

    it('destroys nothing — the brand, its wishlists and its user survive', async () => {
      await deactivate(adminId, brandUserId).expect(200);

      expect(await prisma.user.count({ where: { id: brandUserId } })).toBe(1);
      expect(
        await prisma.brandProfile.count({ where: { id: brandProfileId } }),
      ).toBe(1);
      expect(
        await prisma.brandWishlist.count({
          where: { brandId: brandProfileId },
        }),
      ).toBe(1);
    });

    it('is idempotent and does not re-credit a repeat call', async () => {
      await deactivate(otherAdminId, brandUserId).expect(200);
      const first = await prisma.user.findUnique({
        where: { id: brandUserId },
        select: { statusChangedAt: true, statusChangedById: true },
      });

      await deactivate(adminId, brandUserId).expect(200);
      const second = await prisma.user.findUnique({
        where: { id: brandUserId },
        select: { statusChangedAt: true, statusChangedById: true },
      });

      // The second call changed nothing, so it must not claim the change.
      expect(second).toEqual(first);
    });
  });

  describe('lockout', () => {
    it('drops the live session, so the sign-out is immediate', async () => {
      await prisma.session.create({
        data: {
          userId: brandUserId,
          refreshTokenHash: 'hash-1',
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });

      await deactivate(adminId, brandUserId).expect(200);

      expect(
        await prisma.session.count({ where: { userId: brandUserId } }),
      ).toBe(0);
    });

    it('stops /me resolving, so the client signs out', async () => {
      await deactivate(adminId, brandUserId).expect(200);

      expect(await auth.getMeForClient(brandUserId)).toBeNull();
    });

    it('makes every authenticated request 401 for that user', async () => {
      await deactivate(adminId, brandUserId).expect(200);

      // The lookup behind JwtAuthGuard is what every protected route runs.
      expect(await auth.getUserById(brandUserId)).toBeNull();
    });

    it('leaves other accounts untouched', async () => {
      await deactivate(adminId, brandUserId).expect(200);

      const other = await prisma.user.findUnique({
        where: { id: creatorOnlyUserId },
        select: { status: true },
      });
      expect(other?.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('what the admin can still see', () => {
    beforeEach(async () => {
      await deactivate(adminId, brandUserId).expect(200);
    });

    it('keeps the brand in the admin list, in full', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/brands?page=1&limit=20')
        .set(asUser(adminId))
        .expect(200);

      const row = (res.body as ListBody).items.find(
        (i) => i.userId === brandUserId,
      );
      expect(row).toBeDefined();
      expect(row).toMatchObject({
        brandName: 'Acme Skincare',
        email: 'owner@acme.com',
        contactPhone: '+91 98765 43210',
        status: UserStatus.DEACTIVATED,
        wishlistCount: 1,
      });
    });

    it('returns every detail field, plus who deactivated and when', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/brands/${brandProfileId}`)
        .set(asUser(adminId))
        .expect(200);

      expect(res.body as DetailBody).toMatchObject({
        brandName: 'Acme Skincare',
        contactFullName: 'Jane Doe',
        contactEmail: 'jane@acme.com',
        contactPhone: '+91 98765 43210',
        website: 'https://acme.com',
        status: UserStatus.DEACTIVATED,
        statusChangedByName: 'Bipasha Roy',
        statusChangedByEmail: 'admin@gocollab.io',
      });
      expect((res.body as DetailBody).statusChangedAt).toBeTruthy();
    });

    it('still lists the brand wishlists', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/brands/${brandProfileId}/wishlists`)
        .set(asUser(adminId))
        .expect(200);

      const body = res.body as WishlistsBody;
      expect(body.items).toHaveLength(1);
      expect(body.items[0].name).toBe('Spring picks');
    });
  });

  describe('reactivating', () => {
    it('restores access and re-credits the acting admin', async () => {
      await deactivate(adminId, brandUserId).expect(200);

      const res = await activate(otherAdminId, brandUserId).expect(200);
      expect((res.body as StatusBody).status).toBe(UserStatus.ACTIVE);

      expect(await auth.getUserById(brandUserId)).not.toBeNull();
      const row = await prisma.user.findUnique({
        where: { id: brandUserId },
        select: { statusChangedById: true },
      });
      expect(row?.statusChangedById).toBe(otherAdminId);
    });

    it('leaves the brand data exactly as it was', async () => {
      await deactivate(adminId, brandUserId).expect(200);
      await activate(adminId, brandUserId).expect(200);

      const brand = await prisma.brandProfile.findUnique({
        where: { id: brandProfileId },
        select: { brandName: true, contactPhone: true },
      });
      expect(brand).toEqual({
        brandName: 'Acme Skincare',
        contactPhone: '+91 98765 43210',
      });
    });
  });

  describe('refusals', () => {
    it('refuses an admin deactivating themselves', async () => {
      // The admin must also hold a brand profile, or the request would be
      // refused by the "no brand access" check and this would pass without the
      // self-guard existing at all. Holding both is exactly the case the
      // self-guard is for: otherwise they lock themselves out of the dashboard
      // they would need to undo it.
      await prisma.brandProfile.create({
        data: { userId: adminId, brandName: 'Admin-owned brand' },
      });

      const res = await deactivate(adminId, adminId).expect(400);
      expect(String((res.body as ErrorBody).message)).toMatch(
        /your own status/i,
      );

      const row = await prisma.user.findUnique({
        where: { id: adminId },
        select: { status: true },
      });
      expect(row?.status).toBe(UserStatus.ACTIVE);
    });

    it('404s for a user that does not exist', async () => {
      const missingId = '00000000-0000-4000-8000-000000000000';
      await deactivate(adminId, missingId).expect(404);
    });

    it('400s for a user with no brand access', async () => {
      await deactivate(adminId, creatorOnlyUserId).expect(400);

      const row = await prisma.user.findUnique({
        where: { id: creatorOnlyUserId },
        select: { status: true },
      });
      expect(row?.status).toBe(UserStatus.ACTIVE);
    });
  });
});
