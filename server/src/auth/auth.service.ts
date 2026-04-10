import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, Prisma, RoleName } from '@prisma/client';
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

export type MeUser = {
  id: string;
  email: string;
  name: string | null;
  roles: ('CREATOR' | 'BRAND' | 'ADMIN')[];
  /** Session-scoped role the user is currently acting as. */
  activeRole: 'CREATOR' | 'BRAND' | 'ADMIN' | null;
  /** Cross-session default; used as a fallback when no active role is set. */
  primaryRole: 'CREATOR' | 'BRAND' | 'ADMIN' | null;
  hasCreatorProfile: boolean;
  hasBrandProfile: boolean;
  brandAccessRevoked: boolean;
};

export interface AuthResult {
  user: MeUser;
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

  private asWorkspaceRole(
    name: string | null | undefined,
  ): 'CREATOR' | 'BRAND' | 'ADMIN' | null {
    return name === 'CREATOR' || name === 'BRAND' || name === 'ADMIN'
      ? name
      : null;
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

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name ?? null,
        passwordHash,
        // New users may start without any workspace role selected.
        // They must call `POST /auth/workspace` to pick CREATOR or BRAND.
        primaryRoleId: null,
      },
    });

    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(user.id, meta);
    const me = await this.getMeForClient(user.id, refreshToken);
    if (!me) {
      throw new UnauthorizedException('Account could not be loaded');
    }
    return { user: me, accessToken, refreshToken, expiresIn };
  }

  async registerAdmin(
    dto: RegisterDto,
  ): Promise<{ user: { id: string; email: string; name: string | null } }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const adminRole = await this.prisma.role.findUnique({
      where: { name: RoleName.ADMIN },
      select: { id: true },
    });
    if (!adminRole) {
      throw new BadRequestException('Workspace role is not configured');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name ?? null,
        passwordHash,
        primaryRoleId: adminRole.id,
        userRoles: {
          create: { roleId: adminRole.id },
        },
        emailVerified: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
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
    const me = await this.getMeForClient(user.id, refreshToken);
    if (!me) {
      throw new UnauthorizedException('Account could not be loaded');
    }
    return { user: me, accessToken, refreshToken, expiresIn };
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
    const me = await this.getMeForClient(user.id, refreshToken);
    if (!me) {
      throw new UnauthorizedException('Account could not be loaded');
    }
    return { user: me, accessToken, refreshToken, expiresIn };
  }

  private async findOrCreateGoogleUser(
    profile: GoogleUserInfo,
    googleRefreshToken?: string,
  ): Promise<{ id: string; primaryRoleId: string | null }> {
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
      return {
        id: authAccount.user.id,
        primaryRoleId: authAccount.user.primaryRoleId,
      };
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      if (!user) {
        throw new UnauthorizedException('Account could not be loaded');
      }
      await this.prisma.authAccount.create({
        data: {
          userId: user.id,
          provider: AuthProvider.GOOGLE,
          providerUserId,
          refreshToken: googleRefreshToken ?? null,
        },
      });
      return { id: user.id, primaryRoleId: user.primaryRoleId };
    }

    user = await this.prisma.user.create({
      data: {
        email,
        name: profile.name ?? null,
        passwordHash: null,
        emailVerified: true,
        primaryRoleId: null,
      },
    });
    await this.prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: AuthProvider.GOOGLE,
        providerUserId,
        refreshToken: googleRefreshToken ?? null,
      },
    });
    return { id: user.id, primaryRoleId: user.primaryRoleId };
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { primaryRoleId: true },
    });

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hash,
        activeRoleId: user?.primaryRoleId ?? null,
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

  async getMeForClient(
    userId: string,
    refreshToken?: string,
  ): Promise<MeUser | null> {
    const user: any = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        brandAccessRevokedAt: true,
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
        creatorProfile: { select: { id: true } },
        brandProfile: { select: { id: true } },
      },
    });
    if (!user || user.status !== 'ACTIVE') return null;

    const roleSet = new Set<'CREATOR' | 'BRAND' | 'ADMIN'>();
    for (const ur of user.userRoles) {
      const n = ur.role.name;
      if (n === 'CREATOR' || n === 'BRAND' || n === 'ADMIN') {
        roleSet.add(n);
      }
    }
    const pr = user.primaryRole?.name;
    if (pr === 'CREATOR' || pr === 'BRAND' || pr === 'ADMIN') {
      roleSet.add(pr);
    }
    const roles = Array.from(roleSet);

    let primaryRole: 'CREATOR' | 'BRAND' | 'ADMIN' | null =
      pr === 'CREATOR' || pr === 'BRAND' || pr === 'ADMIN' ? pr : null;
    if (primaryRole === null && roles.length > 0) {
      primaryRole = roles[0];
    }

    // Session-scoped active role.
    let activeRole: 'CREATOR' | 'BRAND' | 'ADMIN' | null = null;
    if (refreshToken) {
      const hash = this.hashRefreshToken(refreshToken);
      const session = await this.prisma.session.findFirst({
        where: {
          userId,
          refreshTokenHash: hash,
          expiresAt: { gt: new Date() },
        },
        select: { activeRole: { select: { name: true } } },
      });
      activeRole = this.asWorkspaceRole(session?.activeRole?.name);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      activeRole,
      primaryRole,
      hasCreatorProfile: !!user.creatorProfile,
      hasBrandProfile: !!user.brandProfile,
      brandAccessRevoked: !!user.brandAccessRevokedAt,
    };
  }

  async selectWorkspace(
    userId: string,
    role: 'CREATOR' | 'BRAND',
    setPrimary: boolean,
    refreshToken: string | undefined,
  ): Promise<MeUser> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    const roleRow = await this.prisma.role.findUnique({
      where: { name: role },
      select: { id: true },
    });
    if (!roleRow) {
      throw new BadRequestException('Workspace role is not configured');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        brandAccessRevokedAt: true,
      } as any,
    });

    if (!user) {
      throw new UnauthorizedException('Account could not be loaded');
    }

    if (role === 'BRAND' && (user as any).brandAccessRevokedAt) {
      throw new ForbiddenException(
        'Brand workspace access has been removed by an admin',
      );
    }

    const hash = this.hashRefreshToken(refreshToken);
    const now = new Date();

    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.userRole.upsert({
        where: { userId_roleId: { userId, roleId: roleRow.id } },
        create: { userId, roleId: roleRow.id },
        update: {},
      }),
      this.prisma.session.updateMany({
        where: {
          userId,
          refreshTokenHash: hash,
          expiresAt: { gt: now },
        },
        data: { activeRoleId: roleRow.id },
      }),
    ];

    if (setPrimary) {
      ops.splice(
        1,
        0,
        this.prisma.user.update({
          where: { id: userId },
          data: { primaryRoleId: roleRow.id },
        }),
      );
    }

    const results = await this.prisma.$transaction(ops);
    const sessionUpdate = results[results.length - 1] as { count: number };

    if (sessionUpdate.count === 0) {
      throw new UnauthorizedException('Session not found or expired');
    }

    const me = await this.getMeForClient(userId, refreshToken);
    if (!me) {
      throw new UnauthorizedException('Account could not be loaded');
    }
    return me;
  }
}

export const AUTH_COOKIE_NAMES = {
  accessToken: ACCESS_TOKEN_COOKIE_NAME,
  refreshToken: REFRESH_TOKEN_COOKIE_NAME,
} as const;
