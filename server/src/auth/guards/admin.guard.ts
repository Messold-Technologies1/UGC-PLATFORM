import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing user');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    if (user.userRoles.some((ur) => ur.role.name === RoleName.ADMIN)) return true;

    throw new ForbiddenException('Admin access required');
  }
}

