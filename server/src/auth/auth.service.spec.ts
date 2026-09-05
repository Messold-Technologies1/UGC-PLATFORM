import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { ApprovalStatus, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const jwt = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const config = {
    get: jest.fn((_: string, defaultValue?: string) => defaultValue),
  };

  const signupRegistration = {
    registerCreatorUser: jest.fn(),
    registerBrandUser: jest.fn(),
    registerAgencyUser: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.restoreAllMocks();
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
    prisma.session.create.mockReset();
    prisma.session.findFirst.mockReset();
    prisma.session.delete.mockReset();
    prisma.session.deleteMany.mockReset();
    jwt.sign.mockReset();
    jwt.verifyAsync.mockReset();
    config.get.mockClear();
    jest.mocked(bcrypt.compare).mockReset();

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
      signupRegistration as any,
      { enabled: false, sendEvent: jest.fn() } as any,
    );
  });

  it('logs in when the password is valid and the role matches the primary role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'hashed-password',
      status: 'ACTIVE',
      primaryRole: { name: RoleName.CREATOR },
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwt.sign
      .mockReturnValueOnce('refresh-token')
      .mockReturnValueOnce('access-token');
    prisma.session.create.mockResolvedValue({ id: 'session-1' });
    jest.spyOn(service, 'getMeForClient').mockResolvedValue({
      id: 'user-1',
      email: 'creator@example.com',
      name: 'Creator User',
      roles: ['CREATOR'],
      primaryRole: 'CREATOR',
      hasCreatorProfile: true,
      hasBrandProfile: false,
      hasAgencyProfile: false,
      brandAccessRevoked: false,
      activeBrandProfileId: null,
      accessibleBrands: [],
      canManageAdmins: false,
    });

    const result = await service.login({
      email: 'creator@example.com',
      password: 'password123',
      role: RoleName.CREATOR,
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.primaryRole).toBe('CREATOR');
  });

  it('rejects login when the role does not match the primary role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: 'hashed-password',
      status: 'ACTIVE',
      primaryRole: { name: RoleName.BRAND },
    });
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    await expect(
      service.login({
        email: 'brand@example.com',
        password: 'password123',
        role: RoleName.CREATOR,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns /auth/me data without session-scoped active workspace state', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      status: 'ACTIVE',
      brandAccessRevokedAt: null,
      primaryRole: { name: RoleName.BRAND },
      userRoles: [{ role: { name: RoleName.CREATOR } }],
      creatorProfile: {
        id: 'creator-profile-1',
        creatorApproval: { status: ApprovalStatus.APPROVED },
      },
      brandProfile: {
        id: 'brand-profile-1',
        brandName: 'Acme',
        logoUrl: null,
      },
      ownedAgency: null,
    });

    const result = await service.getMeForClient('user-1');

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      primaryRole: 'BRAND',
      hasCreatorProfile: true,
      creatorApprovalStatus: ApprovalStatus.APPROVED,
      hasBrandProfile: true,
      hasAgencyProfile: false,
      brandAccessRevoked: false,
      activeBrandProfileId: 'brand-profile-1',
      canManageAdmins: false,
    });
    expect(result?.roles).toEqual(expect.arrayContaining(['BRAND', 'CREATOR']));
  });

  it('falls back primaryRole to the first allowed role when no primary role is set', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      status: 'ACTIVE',
      brandAccessRevokedAt: null,
      primaryRole: null,
      userRoles: [{ role: { name: RoleName.CREATOR } }],
      creatorProfile: {
        id: 'creator-profile-1',
        creatorApproval: { status: ApprovalStatus.PENDING },
      },
      brandProfile: null,
      ownedAgency: null,
    });

    const result = await service.getMeForClient('user-1');

    expect(result).toMatchObject({
      primaryRole: 'CREATOR',
      roles: ['CREATOR'],
      hasCreatorProfile: true,
      creatorApprovalStatus: ApprovalStatus.PENDING,
      hasBrandProfile: false,
      hasAgencyProfile: false,
      activeBrandProfileId: null,
      accessibleBrands: [],
      canManageAdmins: false,
    });
  });

  it('sets canManageAdmins only for designated super-admin emails', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      email: 'anuj@messold.com',
      name: 'Anuj',
      status: 'ACTIVE',
      brandAccessRevokedAt: null,
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [{ role: { name: RoleName.ADMIN } }],
      creatorProfile: null,
      brandProfile: null,
      ownedAgency: null,
    });

    const allowed = await service.getMeForClient('admin-1');
    expect(allowed?.canManageAdmins).toBe(true);

    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      email: 'other.admin@messold.com',
      name: 'Other Admin',
      status: 'ACTIVE',
      brandAccessRevokedAt: null,
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [{ role: { name: RoleName.ADMIN } }],
      creatorProfile: null,
      brandProfile: null,
      ownedAgency: null,
    });

    const denied = await service.getMeForClient('admin-2');
    expect(denied?.canManageAdmins).toBe(false);
  });

  it('omits creatorApprovalStatus when the user has no CREATOR role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'brand@example.com',
      name: 'Brand User',
      status: 'ACTIVE',
      brandAccessRevokedAt: null,
      primaryRole: { name: RoleName.BRAND },
      userRoles: [{ role: { name: RoleName.BRAND } }],
      creatorProfile: null,
      brandProfile: {
        id: 'brand-profile-1',
        brandName: 'Acme',
        logoUrl: null,
      },
      ownedAgency: null,
    });

    const result = await service.getMeForClient('user-1');

    expect(result?.creatorApprovalStatus).toBeUndefined();
  });

  it('returns 401 instead of throwing when the refresh token is expired/invalid', async () => {
    // jsonwebtoken throws (e.g. TokenExpiredError) for an expired refresh token.
    jwt.verifyAsync.mockRejectedValue(
      Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }),
    );
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh('expired-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // The stale session row (if any) is purged so the token can't be retried.
    expect(prisma.session.deleteMany).toHaveBeenCalledTimes(1);
    // No new tokens are minted for an invalid refresh token.
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('rotates the access token when the refresh token is valid and the session is live', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    prisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date('2999-01-01T00:00:00.000Z'),
      user: { id: 'user-1' },
    });
    jwt.sign.mockReturnValue('new-access-token');

    const result = await service.refresh('valid-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('valid-refresh-token');
  });

  it('returns 401 when the stored session has expired', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1' });
    prisma.session.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      expiresAt: new Date('2000-01-01T00:00:00.000Z'),
      user: { id: 'user-1' },
    });
    prisma.session.delete.mockResolvedValue({ id: 'session-1' });

    await expect(service.refresh('valid-but-stale-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.session.delete).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    });
  });
});
