import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  mixin,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_COOKIE_NAMES } from '../auth.service';

type WorkspaceRole = 'CREATOR' | 'BRAND' | 'ADMIN';

function hashRefreshToken(refreshToken: string): string {
  return createHash('sha256').update(refreshToken).digest('hex');
}

function extractRefreshToken(request: Request): string | null {
  const token = request.cookies?.[AUTH_COOKIE_NAMES.refreshToken];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/**
 * Guard that enforces the currently selected workspace for this session
 * (`Session.activeRoleId`) matches `requiredRole`.
 *
 * Use with `JwtAuthGuard` (so `req.user.id` exists).
 */
export function ActiveWorkspaceGuard(requiredRole: WorkspaceRole) {
  @Injectable()
  class ActiveWorkspaceGuardMixin implements CanActivate {
    constructor(readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context
        .switchToHttp()
        .getRequest<Request & { user?: { id: string } }>();

      const userId = req.user?.id;
      if (!userId) throw new UnauthorizedException('Missing user');

      const refreshToken = extractRefreshToken(req);
      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token required');
      }

      const refreshTokenHash = hashRefreshToken(refreshToken);

      const session = await this.prisma.session.findFirst({
        where: {
          userId,
          refreshTokenHash,
          expiresAt: { gt: new Date() },
        },
        select: { activeRole: { select: { name: true } } },
      });

      const active = session?.activeRole?.name;
      if (active !== requiredRole) {
        throw new ForbiddenException(
          `Select ${requiredRole} workspace before continuing`,
        );
      }

      return true;
    }
  }

  return mixin(ActiveWorkspaceGuardMixin);
}

