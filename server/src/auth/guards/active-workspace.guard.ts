import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  mixin,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

type WorkspaceRole = 'CREATOR' | 'BRAND' | 'ADMIN';

/**
 * Guard that enforces the authenticated user has `requiredRole`.
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

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          status: true,
          primaryRole: { select: { name: true } },
          userRoles: { select: { role: { select: { name: true } } } },
        },
      });

      if (!user?.status || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not found or inactive');
      }

      const required = requiredRole as RoleName;
      if (user.primaryRole?.name === required) return true;
      if (user.userRoles.some((ur) => ur.role.name === required)) return true;

      throw new ForbiddenException(
        `Missing ${requiredRole} role required for this endpoint`,
      );
    }
  }

  return mixin(ActiveWorkspaceGuardMixin);
}

