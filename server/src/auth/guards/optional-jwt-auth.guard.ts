import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAMES } from '../auth.service';
import { AuthService } from '../auth.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) return true;

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      const user = await this.authService.getUserById(payload.sub);
      if (user) {
        (
          request as Request & {
            user?: { id: string; email: string; name: string | null };
          }
        ).user = user;
      }
    } catch {
      // Ignore invalid tokens; treat as anonymous.
    }
    return true;
  }

  private extractToken(request: Request): string | null {
    const cookieToken = request.cookies?.[AUTH_COOKIE_NAMES.accessToken];
    if (cookieToken) return cookieToken;

    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    return null;
  }
}
