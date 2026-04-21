import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { WorkspacePermissionGuard } from './workspace-permission.guard';

describe('WorkspacePermissionGuard', () => {
  function createContext(userId?: string): ExecutionContext {
    return {
      getHandler: () => 'handler',
      getClass: () => class TestClass {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: userId ? { id: userId } : undefined,
        }),
      }),
    } as ExecutionContext;
  }

  function createGuard(options?: {
    requiredWorkspace?: 'BRAND' | 'CREATOR';
    user?: {
      brandAccessRevokedAt: Date | null;
      primaryRole?: { name: RoleName | null } | null;
      userRoles: Array<{ role: { name: RoleName | null } | null }>;
    } | null;
  }) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(options?.requiredWorkspace),
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(options?.user ?? null),
      },
    };

    return {
      guard: new WorkspacePermissionGuard(
        reflector as unknown as Reflector,
        prisma as unknown as PrismaService,
      ),
      reflector,
      prisma,
    };
  }

  it('allows access when no workspace metadata is defined', async () => {
    const { guard, prisma } = createGuard();

    await expect(guard.canActivate(createContext('user-1'))).resolves.toBe(
      true,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('throws when authenticated user is missing', async () => {
    const { guard } = createGuard({
      requiredWorkspace: 'BRAND',
    });

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows a brand user into brand workspace routes without prior workspace selection', async () => {
    const { guard } = createGuard({
      requiredWorkspace: 'BRAND',
      user: {
        brandAccessRevokedAt: null,
        primaryRole: { name: RoleName.BRAND },
        userRoles: [],
      },
    });

    await expect(guard.canActivate(createContext('user-1'))).resolves.toBe(
      true,
    );
  });

  it('allows a creator user into creator workspace routes without prior workspace selection', async () => {
    const { guard } = createGuard({
      requiredWorkspace: 'CREATOR',
      user: {
        brandAccessRevokedAt: null,
        primaryRole: null,
        userRoles: [{ role: { name: RoleName.CREATOR } }],
      },
    });

    await expect(guard.canActivate(createContext('user-1'))).resolves.toBe(
      true,
    );
  });

  it('allows a dual-role user to enter the creator namespace directly when their primary role is brand', async () => {
    const { guard } = createGuard({
      requiredWorkspace: 'CREATOR',
      user: {
        brandAccessRevokedAt: null,
        primaryRole: { name: RoleName.BRAND },
        userRoles: [{ role: { name: RoleName.CREATOR } }],
      },
    });

    await expect(guard.canActivate(createContext('user-1'))).resolves.toBe(
      true,
    );
  });

  it('allows a dual-role user to enter the brand namespace directly when their primary role is creator', async () => {
    const { guard } = createGuard({
      requiredWorkspace: 'BRAND',
      user: {
        brandAccessRevokedAt: null,
        primaryRole: { name: RoleName.CREATOR },
        userRoles: [{ role: { name: RoleName.BRAND } }],
      },
    });

    await expect(guard.canActivate(createContext('user-1'))).resolves.toBe(
      true,
    );
  });

  it('rejects when the required workspace role is missing', async () => {
    const { guard } = createGuard({
      requiredWorkspace: 'CREATOR',
      user: {
        brandAccessRevokedAt: null,
        primaryRole: { name: RoleName.BRAND },
        userRoles: [],
      },
    });

    await expect(
      guard.canActivate(createContext('user-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects revoked brand access even if the user has the brand role', async () => {
    const { guard } = createGuard({
      requiredWorkspace: 'BRAND',
      user: {
        brandAccessRevokedAt: new Date(),
        primaryRole: { name: RoleName.BRAND },
        userRoles: [],
      },
    });

    await expect(
      guard.canActivate(createContext('user-1')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
