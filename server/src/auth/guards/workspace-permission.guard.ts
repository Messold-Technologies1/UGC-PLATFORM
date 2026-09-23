import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  REQUIRED_WORKSPACE_KEY,
  type WorkspaceRole,
} from '../decorators/required-workspace.decorator';

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredWorkspace = this.reflector.getAllAndOverride<
      WorkspaceRole | undefined
    >(REQUIRED_WORKSPACE_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredWorkspace) {
      return true;
    }

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string } }>();

    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing user');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        brandAccessRevokedAt: true,
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user || !user.status || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found');
    }

    const roles = new Set<RoleName>();
    if (user.primaryRole?.name) {
      roles.add(user.primaryRole.name);
    }
    for (const userRole of user.userRoles) {
      if (userRole.role?.name) {
        roles.add(userRole.role.name);
      }
    }

    const hasWorkspace =
      roles.has(requiredWorkspace) ||
      (requiredWorkspace === 'BRAND' && roles.has(RoleName.AGENCY));

    if (!hasWorkspace) {
      throw new ForbiddenException(
        `${requiredWorkspace} workspace access required`,
      );
    }

    if (
      (requiredWorkspace === 'BRAND' || requiredWorkspace === 'AGENCY') &&
      roles.has(RoleName.BRAND) &&
      user.brandAccessRevokedAt
    ) {
      throw new ForbiddenException(
        'Brand workspace access has been removed by an admin',
      );
    }

    return true;
  }
}
