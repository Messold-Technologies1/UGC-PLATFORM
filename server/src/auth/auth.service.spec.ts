import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
  };

  const jwt = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const config = {
    get: jest.fn((_: string, defaultValue?: string) => defaultValue),
  };

  let service: AuthService;

  beforeEach(() => {
    prisma.user.findUnique.mockReset();
    prisma.user.update.mockReset();
    prisma.session.create.mockReset();
    jwt.sign.mockReset();
    jwt.verifyAsync.mockReset();
    config.get.mockClear();

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
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
      creatorProfile: { id: 'creator-profile-1' },
      brandProfile: { id: 'brand-profile-1' },
    });

    const result = await service.getMeForClient('user-1');

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      primaryRole: 'BRAND',
      hasCreatorProfile: true,
      hasBrandProfile: true,
      brandAccessRevoked: false,
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
      creatorProfile: { id: 'creator-profile-1' },
      brandProfile: null,
    });

    const result = await service.getMeForClient('user-1');

    expect(result).toMatchObject({
      primaryRole: 'CREATOR',
      roles: ['CREATOR'],
      hasCreatorProfile: true,
      hasBrandProfile: false,
    });
  });
});
