import {
  ConflictException,
  BadRequestException,  
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApprovalStatus, AuthProvider, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { RegisterCreatorDto } from './dto/register-creator.dto';
import type { RegisterBrandDto } from './dto/register-brand.dto';
import type { RegisterAgencyDto } from './dto/register-agency.dto';
import { SignupRegistrationService } from './signup-registration.service';
import { MetaCapiService, splitFullName } from '../meta-capi/meta-capi.service';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export type MeBrandSummary = {
  id: string;
  brandName: string | null;
  logoUrl: string | null;
};

export type MeUser = {
  id: string;
  email: string;
  name: string | null;
  roles: ('CREATOR' | 'BRAND' | 'ADMIN' | 'AGENCY')[];
  primaryRole: 'CREATOR' | 'BRAND' | 'ADMIN' | 'AGENCY' | null;
  hasCreatorProfile: boolean;
  hasBrandProfile: boolean;
  hasAgencyProfile: boolean;
  brandAccessRevoked: boolean;
  activeBrandProfileId: string | null;
  accessibleBrands: MeBrandSummary[];
  /** Present when `roles` includes CREATOR; null if no creator profile yet. */
  creatorApprovalStatus?: ApprovalStatus | null;
  /** Creator's one-way Go-Live latch. Drives the post-login redirect to finish setup. */
  creatorProfileComplete?: boolean;
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

type MeLookupUser = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  brandAccessRevokedAt: Date | null;
  primaryRole: { name: RoleName | null } | null;
  userRoles: Array<{ role: { name: RoleName | null } }>;
  creatorProfile: {
    id: string;
    completeProfile: boolean;
    creatorApproval: { status: ApprovalStatus } | null;
  } | null;
  brandProfile: { id: string; brandName: string | null; logoUrl: string | null } | null;
  ownedAgency: {
    id: string;
    lastActiveBrandProfileId: string | null;
    brands: MeBrandSummary[];
  } | null;
};

const ME_WORKSPACE_ROLES = [
  'CREATOR',
  'BRAND',
  'ADMIN',
  'AGENCY',
] as const;

type MeWorkspaceRole = (typeof ME_WORKSPACE_ROLES)[number];

function isMeWorkspaceRole(name: RoleName | null | undefined): name is MeWorkspaceRole {
  return (
    name === 'CREATOR' ||
    name === 'BRAND' ||
    name === 'ADMIN' ||
    name === 'AGENCY'
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly signupRegistration: SignupRegistrationService,
    private readonly metaCapi: MetaCapiService,
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

  /**
   * Mint a short-lived JWT the client can pass in the Socket.IO handshake
   * (`auth.token`). Needed for in-app browsers, where the httpOnly auth cookie
   * is not sent on the cross-origin WebSocket connection. Same secret/shape as
   * the access token, so the gateways verify it with no extra config.
   */
  issueSocketToken(userId: string): string {
    return this.jwt.sign(
      { sub: userId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.asJwtExpiresIn(this.getAccessExpiry()),
      },
    );
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
        primaryRoleId: null,
      },
    });

    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(user.id, meta);
    const me = await this.getMeForClient(user.id);
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

  private async authResultAfterSignup(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(userId, meta);
    const me = await this.getMeForClient(userId);
    if (!me) {
      throw new UnauthorizedException('Account could not be loaded');
    }
    return { user: me, accessToken, refreshToken, expiresIn };
  }

  async registerCreator(
    dto: RegisterCreatorDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const userId = await this.signupRegistration.registerCreatorUser(dto, meta);
    // Server-side twin of the browser CompleteRegistration event, deduplicated
    // via the shared metaSignupEventId. Best-effort / fire-and-forget.
    if (this.metaCapi.enabled) {
      void this.metaCapi.sendEvent({
        eventName: 'CreatorRegistration',
        eventId: dto.metaSignupEventId,
        actionSource: 'website',
        eventSourceUrl:
          this.config.get<string>('FRONTEND_URL') || undefined,
        userData: {
          email: dto.email,
          phone: dto.phone,
          ...splitFullName(dto.name),
          fbp: dto.metaFbp,
          fbc: dto.metaFbc,
          clientIpAddress: meta?.ipAddress,
          clientUserAgent: meta?.userAgent,
        },
      });
    }
    return this.authResultAfterSignup(userId, meta);
  }

  async registerBrand(
    dto: RegisterBrandDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const userId = await this.signupRegistration.registerBrandUser(dto);
    return this.authResultAfterSignup(userId, meta);
  }

  async registerAgency(
    dto: RegisterAgencyDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const userId = await this.signupRegistration.registerAgencyUser(dto);
    return this.authResultAfterSignup(userId, meta);
  }

  async login(
    dto: LoginDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        passwordHash: true,
        status: true,
        primaryRole: { select: { name: true } },
      },
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

    if (user.primaryRole?.name !== dto.role) {
      throw new UnauthorizedException('Invalid role');
    }

    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(user.id, meta);
    const me = await this.getMeForClient(user.id);
    if (!me) {
      throw new UnauthorizedException('Account could not be loaded');
    }
    return { user: me, accessToken, refreshToken, expiresIn };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const hash = this.hashRefreshToken(refreshToken);

    let payload: { sub: string };
    try {
      payload = await this.verifyRefreshToken(refreshToken);
    } catch {
      // The refresh token itself is expired/malformed/tampered. `jsonwebtoken`
      // throws (e.g. TokenExpiredError) which would otherwise bubble up as an
      // unhandled 500 and get logged by Nest's ExceptionsHandler. Purge any
      // lingering session row for this token and return a clean 401 so the
      // client can redirect to login (matches the documented 401 response).
      await this.prisma.session
        .deleteMany({ where: { refreshTokenHash: hash } })
        .catch(() => {});
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

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
    intendedRole?: 'BRAND' | 'CREATOR' | null,
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
      intendedRole ?? null,
    );
    const { accessToken, refreshToken, expiresIn } =
      await this.createSessionAndTokens(user.id, meta);
    const me = await this.getMeForClient(user.id);
    if (!me) {
      throw new UnauthorizedException('Account could not be loaded');
    }
    return { user: me, accessToken, refreshToken, expiresIn };
  }

  private async ensureUserHasRole(
    userId: string,
    roleName: Extract<RoleName, 'BRAND' | 'CREATOR'>,
    opts?: { forcePrimary?: boolean },
  ): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
      select: { id: true },
    });
    if (!role) {
      throw new UnauthorizedException(`${roleName} role not configured`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryRoleId: true,
        primaryRole: { select: { id: true, name: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // One email = one workspace role. Never attach CREATOR/BRAND on top of a
    // different primary, and never force-switch primary between workspaces.
    const primaryName = user.primaryRole?.name ?? null;
    if (
      primaryName &&
      primaryName !== roleName &&
      (primaryName === RoleName.CREATOR ||
        primaryName === RoleName.BRAND ||
        primaryName === RoleName.AGENCY ||
        primaryName === RoleName.ADMIN)
    ) {
      throw new ConflictException(
        `This email is already registered as a ${primaryName.toLowerCase()}. Sign in with that account type instead of creating another.`,
      );
    }

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });

    if (opts?.forcePrimary) {
      if (user.primaryRoleId && user.primaryRoleId !== role.id) {
        throw new ConflictException(
          'This email already has a different primary role',
        );
      }
      await this.prisma.user.update({
        where: { id: userId },
        data: { primaryRoleId: role.id },
      });
    } else if (!user.primaryRoleId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { primaryRoleId: role.id },
      });
    }
  }

  /**
   * Blocks Google OAuth from turning a creator into a brand (or vice versa)
   * on the same email. Legacy multi-role accounts are also refused a switch.
   */
  private async assertGoogleIntendedRoleAllowed(
    userId: string,
    intendedRole: 'BRAND' | 'CREATOR',
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        creatorProfile: { select: { id: true } },
        brandProfile: { select: { id: true } },
      },
    });
    if (!user) return;

    const primary = user.primaryRole?.name ?? null;
    const looksCreator =
      primary === RoleName.CREATOR || Boolean(user.creatorProfile);
    const looksBrand =
      primary === RoleName.BRAND || Boolean(user.brandProfile);

    if (intendedRole === 'BRAND' && looksCreator && !looksBrand) {
      throw new ConflictException(
        'This email is already registered as a creator. Sign in as a creator instead.',
      );
    }
    if (intendedRole === 'CREATOR' && looksBrand && !looksCreator) {
      throw new ConflictException(
        'This email is already registered as a brand. Sign in as a brand instead.',
      );
    }
    if (
      primary === RoleName.AGENCY ||
      primary === RoleName.ADMIN
    ) {
      throw new ConflictException(
        'This email is already registered with another account type. Sign in with that account instead.',
      );
    }
    if (
      primary &&
      primary !== intendedRole &&
      (primary === RoleName.CREATOR || primary === RoleName.BRAND)
    ) {
      throw new ConflictException(
        `This email is already registered as a ${primary.toLowerCase()}. Sign in with that account type instead.`,
      );
    }
  }

  private async findOrCreateGoogleUser(
    profile: GoogleUserInfo,
    googleRefreshToken?: string,
    intendedRole?: 'BRAND' | 'CREATOR' | null,
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

    let userId: string;
    let primaryRoleId: string | null;

    if (authAccount) {
      if (googleRefreshToken) {
        await this.prisma.authAccount.update({
          where: { id: authAccount.id },
          data: { refreshToken: googleRefreshToken },
        });
      }
      userId = authAccount.user.id;
      primaryRoleId = authAccount.user.primaryRoleId;
    } else {
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
        userId = user.id;
        primaryRoleId = user.primaryRoleId;
      } else {
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
        userId = user.id;
        primaryRoleId = null;
      }
    }

    if (intendedRole === 'BRAND' || intendedRole === 'CREATOR') {
      await this.assertGoogleIntendedRoleAllowed(userId, intendedRole);
    }

    if (intendedRole === 'BRAND') {
      const brandProfile = await this.prisma.brandProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      // Only set BRAND primary when unset / already brand — never steal CREATOR.
      await this.ensureUserHasRole(userId, RoleName.BRAND, {
        forcePrimary: !brandProfile,
      });
      const refreshed = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { primaryRoleId: true },
      });
      primaryRoleId = refreshed?.primaryRoleId ?? primaryRoleId;
    } else if (intendedRole === 'CREATOR') {
      await this.ensureUserHasRole(userId, RoleName.CREATOR);
      const refreshed = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { primaryRoleId: true },
      });
      primaryRoleId = refreshed?.primaryRoleId ?? primaryRoleId;
    }

    return { id: userId, primaryRoleId };
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

  async getMeForClient(userId: string): Promise<MeUser | null> {
    const user = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        brandAccessRevokedAt: true,
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
        creatorProfile: {
          select: {
            id: true,
            completeProfile: true,
            creatorApproval: { select: { status: true } },
          },
        },
        brandProfile: {
          select: { id: true, brandName: true, logoUrl: true },
        },
        ownedAgency: {
          select: {
            id: true,
            lastActiveBrandProfileId: true,
            brands: {
              select: { id: true, brandName: true, logoUrl: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    })) as MeLookupUser | null;
    if (!user || user.status !== 'ACTIVE') return null;

    const roleSet = new Set<MeWorkspaceRole>();
    for (const ur of user.userRoles) {
      const n = ur.role.name;
      if (isMeWorkspaceRole(n)) {
        roleSet.add(n);
      }
    }
    const pr = user.primaryRole?.name;
    if (isMeWorkspaceRole(pr)) {
      roleSet.add(pr);
    }
    const roles = Array.from(roleSet);

    let primaryRole: MeWorkspaceRole | null = isMeWorkspaceRole(pr) ? pr : null;
    if (primaryRole === null && roles.length > 0) {
      primaryRole = roles[0];
    }

    const accessibleBrands: MeBrandSummary[] = [];
    if (user.brandProfile) {
      accessibleBrands.push({
        id: user.brandProfile.id,
        brandName: user.brandProfile.brandName,
        logoUrl: user.brandProfile.logoUrl,
      });
    }
    if (user.ownedAgency?.brands?.length) {
      for (const b of user.ownedAgency.brands) {
        if (!accessibleBrands.some((x) => x.id === b.id)) {
          accessibleBrands.push(b);
        }
      }
    }

    let activeBrandProfileId: string | null =
      user.ownedAgency?.lastActiveBrandProfileId ?? null;
    if (
      activeBrandProfileId &&
      !accessibleBrands.some((b) => b.id === activeBrandProfileId)
    ) {
      activeBrandProfileId = null;
    }
    if (!activeBrandProfileId && accessibleBrands.length === 1) {
      activeBrandProfileId = accessibleBrands[0]!.id;
    }

    const me: MeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
      brandAccessRevoked: !!user.brandAccessRevokedAt,
      primaryRole,
      hasCreatorProfile: !!user.creatorProfile,
      hasBrandProfile: !!user.brandProfile,
      hasAgencyProfile: !!user.ownedAgency,
      activeBrandProfileId,
      accessibleBrands,
    };

    if (roles.includes('CREATOR')) {
      me.creatorProfileComplete = user.creatorProfile?.completeProfile ?? false;
      me.creatorApprovalStatus = user.creatorProfile
        ? (user.creatorProfile.creatorApproval?.status ??
          ApprovalStatus.PENDING)
        : null;
    }

    return me;
  }
}

export const AUTH_COOKIE_NAMES = {
  accessToken: ACCESS_TOKEN_COOKIE_NAME,
  refreshToken: REFRESH_TOKEN_COOKIE_NAME,
} as const;
