import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { isSuperAdminEmail } from '../super-admin';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<
      Request & { user?: { email?: string } }
    >();
    const email = request.user?.email;
    if (!email) {
      throw new UnauthorizedException('Missing user');
    }
    if (!isSuperAdminEmail(email)) {
      throw new ForbiddenException(
        'Only designated admins can create admin users',
      );
    }
    return true;
  }
}
