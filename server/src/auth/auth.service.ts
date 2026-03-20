import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: { id: string; email: string; name: string | null };
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface GoogleUserInfo {
  id: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getAccessExpiry(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRY', '15m');
  }

  private getRefreshExpiry(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRY', '7d');
  }

  private asJwtExpiresIn(
    expiresIn: string,
  ): import('jsonwebtoken').SignOptions['expiresIn'] {
    // `jsonwebtoken` types are stricter than our env config (e.g. `StringValue | number`),
    // but at runtime values like `15m` / `7d` are valid.
    return expiresIn as unknown as import('jsonwebtoken').SignOptions['expiresIn'];
  }

  async register(
    dto: RegisterDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'BRAND' },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name ?? null,
        passwordHash,
        primaryRoleId: defaultRole?.id ?? undefined,
      },
    });

    if (defaultRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: defaultRole.id },
      });
    }

    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(user.id, meta);
    const safeUser = { id: user.id, email: user.email, name: user.name };
    return { user: safeUser, accessToken, refreshToken, expiresIn };
  }

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(user.id, meta);
    const safeUser = { id: user.id, email: user.email, name: user.name };
    return { user: safeUser, accessToken, refreshToken, expiresIn };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const hash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { refreshTokenHash: hash, userId: payload.sub },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session)
        await this.prisma.session
          .delete({ where: { id: session.id } })
          .catch(() => {});
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const expiresIn = this.getAccessExpiry();
    const accessToken = this.jwt.sign(
      { sub: session.userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.asJwtExpiresIn(expiresIn),
      },
    );
    return { accessToken, refreshToken, expiresIn };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      const hash = this.hashRefreshToken(refreshToken);
      await this.prisma.session.deleteMany({
        where: { userId: payload.sub, refreshTokenHash: hash },
      });
    } catch {
      // ignore invalid token on logout
    }
  }

  getGoogleAuthUrl(state: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = encodeURIComponent(
      this.config.get<string>('GOOGLE_CALLBACK_URL')!,
    );
    const scope = encodeURIComponent('email profile');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  }

  async handleGoogleCallback(
    code: string,
    state: string,
    storedState: string | undefined,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    if (!storedState || state !== storedState) {
      throw new UnauthorizedException('Invalid state');
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.get<string>('GOOGLE_CLIENT_ID')!,
        client_secret: this.config.get<string>('GOOGLE_CLIENT_SECRET')!,
        redirect_uri: this.config.get<string>('GOOGLE_CALLBACK_URL')!,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new UnauthorizedException(`Google token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
    };

    const userInfoRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    if (!userInfoRes.ok) {
      throw new UnauthorizedException('Failed to fetch Google user info');
    }
    const profile = (await userInfoRes.json()) as GoogleUserInfo;

    const user = await this.findOrCreateGoogleUser(
      profile,
      tokenData.refresh_token,
    );
    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(user.id, meta);
    const safeUser = { id: user.id, email: user.email, name: user.name };
    return { user: safeUser, accessToken, refreshToken, expiresIn };
  }

  private async findOrCreateGoogleUser(
    profile: GoogleUserInfo,
    googleRefreshToken?: string,
  ) {
    const providerUserId = profile.id;
    const email = profile.email?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Google account has no email');
    }

    const authAccount = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: AuthProvider.GOOGLE,
          providerUserId,
        },
      },
      include: { user: true },
    });

    if (authAccount) {
      if (googleRefreshToken) {
        await this.prisma.authAccount.update({
          where: { id: authAccount.id },
          data: { refreshToken: googleRefreshToken },
        });
      }
      return authAccount.user;
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      await this.prisma.authAccount.create({
        data: {
          userId: user.id,
          provider: AuthProvider.GOOGLE,
          providerUserId,
          refreshToken: googleRefreshToken ?? null,
        },
      });
      return user;
    }

    const defaultRole = await this.prisma.role.findUnique({
      where: { name: 'BRAND' },
    });
    user = await this.prisma.user.create({
      data: {
        email,
        name: profile.name ?? null,
        passwordHash: null,
        emailVerified: true,
        primaryRoleId: defaultRole?.id ?? undefined,
      },
    });
    if (defaultRole) {
      await this.prisma.userRole.create({
        data: { userId: user.id, roleId: defaultRole.id },
      });
    }
    await this.prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: AuthProvider.GOOGLE,
        providerUserId,
        refreshToken: googleRefreshToken ?? null,
      },
    });
    return user;
  }

  private async createSessionAndTokens(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const refreshExpiry = this.getRefreshExpiry();
    const refreshToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.asJwtExpiresIn(refreshExpiry),
      },
    );
    const hash = this.hashRefreshToken(refreshToken);
    const expiresAt = this.expiryToDate(refreshExpiry);

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hash,
        expiresAt,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    const accessExpiry = this.getAccessExpiry();
    const accessToken = this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.asJwtExpiresIn(accessExpiry),
      },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiry,
    };
  }

  private expiryToDate(expiry: string): Date {
    const match = expiry.match(/^(\d+)(m|h|d|s)$/);
    const date = new Date();
    if (!match) {
      date.setDate(date.getDate() + 7);
      return date;
    }
    const n = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        date.setSeconds(date.getSeconds() + n);
        break;
      case 'm':
        date.setMinutes(date.getMinutes() + n);
        break;
      case 'h':
        date.setHours(date.getHours() + n);
        break;
      case 'd':
        date.setDate(date.getDate() + n);
        break;
      default:
        date.setDate(date.getDate() + 7);
    }
    return date;
  }

  private async verifyRefreshToken(token: string): Promise<{ sub: string }> {
    return this.jwt.verifyAsync<{ sub: string }>(token, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') return null;
    return { id: user.id, email: user.email, name: user.name };
  }
}

export const AUTH_COOKIE_NAMES = {
  accessToken: ACCESS_TOKEN_COOKIE_NAME,
  refreshToken: REFRESH_TOKEN_COOKIE_NAME,
} as const;
