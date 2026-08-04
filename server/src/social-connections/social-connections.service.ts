import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  SocialConnection,
  SocialConnectionStatus,
  SocialPlatform,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InstagramApiError, InstagramClient } from './instagram.client';
import {
  decryptSecret,
  encryptSecret,
  signState,
  verifyState,
} from './social-crypto.util';
import {
  DemographicBucketDto,
  PublicInstagramInsightsDto,
  SocialAudienceDto,
  SocialConnectionDto,
} from './dto/social-connection-response.dto';

/** Rolling window (days) each sync summarises for reach/views/profile-views. */
const METRICS_WINDOW_DAYS = 30;
/** A connection is re-synced only if its last sync is older than this. */
const SYNC_INTERVAL_DAYS = 3;
/** Refresh a long-lived token when it is within this window of expiring. */
const TOKEN_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60_000;

interface DemographicRecord {
  [key: string]: number;
}

@Injectable()
export class SocialConnectionsService {
  private readonly logger = new Logger(SocialConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly instagram: InstagramClient,
  ) {}

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  private encKey(): string {
    const key = this.config.get<string>('SOCIAL_TOKEN_ENC_KEY');
    if (!key) {
      throw new ServiceUnavailableException(
        'Social connections are not configured (missing SOCIAL_TOKEN_ENC_KEY).',
      );
    }
    return key;
  }

  private assertInstagramConfigured(): void {
    if (!this.instagram.isConfigured()) {
      throw new ServiceUnavailableException(
        'Instagram connection is not configured on the server.',
      );
    }
    this.encKey();
  }

  // ---------------------------------------------------------------------------
  // OAuth connect / callback
  // ---------------------------------------------------------------------------

  /** Build the Instagram authorize URL + the state nonce to store in a cookie. */
  async buildInstagramConnectUrl(
    userId: string,
  ): Promise<{ url: string; nonce: string }> {
    this.assertInstagramConfigured();
    const creator = await this.resolveCreatorProfileId(userId);
    const { state, nonce } = signState(
      { cpid: creator, uid: userId },
      this.encKey(),
    );
    return { url: this.instagram.getAuthUrl(state), nonce };
  }

  /**
   * Handle the OAuth callback: verify the signed state against the CSRF nonce
   * cookie, exchange the code, and upsert the connection. Returns the
   * connection id so the caller can enqueue an initial sync.
   */
  async handleInstagramCallback(
    code: string,
    state: string,
    cookieNonce: string | undefined,
  ): Promise<{ connectionId: string }> {
    this.assertInstagramConfigured();

    const payload = verifyState(state, this.encKey());
    if (!cookieNonce || cookieNonce !== payload.nonce) {
      throw new BadRequestException('Invalid OAuth state');
    }

    // Confirm the creator still exists / belongs to the user.
    const creator = await this.prisma.creatorProfile.findFirst({
      where: { id: payload.cpid, userId: payload.uid },
      select: { id: true },
    });
    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    const token = await this.instagram.exchangeCode(code);
    const account = await this.instagram.fetchAccount(token.accessToken);
    const encrypted = encryptSecret(token.accessToken, this.encKey());

    // The Instagram connection is the source of truth for the creator's public
    // Instagram handle: upsert the connection and mirror the URL onto the
    // CreatorProfile in one transaction so they never drift.
    const connectionId = await this.prisma.$transaction(async (tx) => {
      const connection = await tx.socialConnection.upsert({
        where: {
          creatorProfileId_platform: {
            creatorProfileId: creator.id,
            platform: SocialPlatform.INSTAGRAM,
          },
        },
        create: {
          creatorProfileId: creator.id,
          platform: SocialPlatform.INSTAGRAM,
          providerAccountId: account.userId,
          username: account.username,
          accountType: account.accountType,
          accessToken: encrypted,
          tokenExpiresAt: token.expiresAt,
          scopes: token.scopes,
          status: SocialConnectionStatus.ACTIVE,
          followersCount: account.followersCount,
          mediaCount: account.mediaCount,
          connectedAt: new Date(),
        },
        update: {
          providerAccountId: account.userId,
          username: account.username,
          accountType: account.accountType,
          accessToken: encrypted,
          tokenExpiresAt: token.expiresAt,
          scopes: token.scopes,
          status: SocialConnectionStatus.ACTIVE,
          followersCount: account.followersCount,
          mediaCount: account.mediaCount,
          lastSyncError: null,
          connectedAt: new Date(),
        },
        select: { id: true },
      });

      const igUrl = instagramUrlFromUsername(account.username);
      if (igUrl) {
        await tx.creatorProfile.update({
          where: { id: creator.id },
          data: { instagramUrl: igUrl },
        });
      }

      return connection.id;
    });

    return { connectionId };
  }

  async disconnect(userId: string, platform: SocialPlatform): Promise<void> {
    const creatorId = await this.resolveCreatorProfileId(userId);
    // Cascade removes snapshots. Tokens are destroyed with the row. The IG link
    // is owned by the connection, so clear the mirrored URL when it goes away.
    await this.prisma.$transaction(async (tx) => {
      await tx.socialConnection.deleteMany({
        where: { creatorProfileId: creatorId, platform },
      });
      if (platform === SocialPlatform.INSTAGRAM) {
        await tx.creatorProfile.update({
          where: { id: creatorId },
          data: { instagramUrl: null },
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Read: connections + derived audience
  // ---------------------------------------------------------------------------

  async getConnectionsForUser(userId: string): Promise<SocialConnectionDto[]> {
    const creatorId = await this.resolveCreatorProfileId(userId);
    const connections = await this.prisma.socialConnection.findMany({
      where: { creatorProfileId: creatorId },
      orderBy: { platform: 'asc' },
      include: { audience: true },
    });

    return connections.map((conn) => ({
      platform: conn.platform,
      status: conn.status,
      username: conn.username ?? undefined,
      accountType: conn.accountType ?? undefined,
      followersCount: conn.followersCount ?? undefined,
      mediaCount: conn.mediaCount ?? undefined,
      reach30d: conn.reach30d ?? undefined,
      views30d: conn.views30d ?? undefined,
      profileViews30d: conn.profileViews30d ?? undefined,
      connectedAt: conn.connectedAt.toISOString(),
      lastSyncedAt: conn.lastSyncedAt?.toISOString(),
      lastSyncStatus: conn.lastSyncStatus ?? undefined,
      audience: conn.audience
        ? this.buildAudienceDto(conn.audience)
        : undefined,
    }));
  }

  private buildAudienceDto(audience: {
    snapshotDate: Date;
    followerCount: number | null;
    ageBreakdown: Prisma.JsonValue;
    genderBreakdown: Prisma.JsonValue;
    cityBreakdown: Prisma.JsonValue;
    countryBreakdown: Prisma.JsonValue;
  }): SocialAudienceDto {
    return {
      snapshotDate: audience.snapshotDate.toISOString().slice(0, 10),
      followerCount: audience.followerCount ?? undefined,
      ageRanges: topBuckets(audience.ageBreakdown, 10),
      gender: topBuckets(audience.genderBreakdown, 5),
      topCities: topBuckets(audience.cityBreakdown, 5),
      topCountries: topBuckets(audience.countryBreakdown, 5),
    };
  }

  // ---------------------------------------------------------------------------
  // Public read: Instagram insights for a creator's public profile / drawer
  // ---------------------------------------------------------------------------

  /**
   * Aggregate, read-only Instagram insights for any creator by id — powers the
   * public profile "Audience" section and the browse drawer. Exposes follower/
   * reach/profile-view totals and demographic breakdowns only; never tokens or
   * per-day rows. Returns `{ connected: false }` when there is no active link.
   */
  async getPublicInstagramInsights(
    creatorProfileId: string,
  ): Promise<PublicInstagramInsightsDto> {
    const empty: PublicInstagramInsightsDto = {
      connected: false,
      ageRanges: [],
      gender: [],
      topCities: [],
      topCountries: [],
    };

    const conn = await this.prisma.socialConnection.findUnique({
      where: {
        creatorProfileId_platform: {
          creatorProfileId,
          platform: SocialPlatform.INSTAGRAM,
        },
      },
      include: { audience: true },
    });
    if (!conn || conn.status !== SocialConnectionStatus.ACTIVE) return empty;

    const derived = conn.audience ? this.buildAudienceDto(conn.audience) : null;

    return {
      connected: true,
      username: conn.username ?? undefined,
      followers: conn.followersCount ?? undefined,
      reach: conn.reach30d ?? undefined,
      profileViews: conn.profileViews30d ?? undefined,
      snapshotDate: derived?.snapshotDate,
      ageRanges: derived?.ageRanges ?? [],
      gender: derived?.gender ?? [],
      topCities: derived?.topCities ?? [],
      topCountries: derived?.topCountries ?? [],
    };
  }

  // ---------------------------------------------------------------------------
  // Sync (called by the BullMQ worker / inline fallback / poller)
  // ---------------------------------------------------------------------------

  /** Fetch + upsert metrics and demographics for one connection. */
  async syncConnection(connectionId: string): Promise<void> {
    const conn = await this.prisma.socialConnection.findUnique({
      where: { id: connectionId },
    });
    if (!conn) return;
    if (conn.platform !== SocialPlatform.INSTAGRAM) {
      this.logger.debug(
        `social sync: ${conn.platform} not implemented yet (connection ${connectionId})`,
      );
      return;
    }
    if (conn.status === SocialConnectionStatus.REVOKED) return;

    try {
      const token = await this.ensureFreshInstagramToken(conn);
      const account = await this.instagram.fetchAccount(token);
      const totals = await this.instagram.fetch30DayTotals(
        token,
        METRICS_WINDOW_DAYS,
      );
      const demographics = await this.instagram.fetchDemographics(token);

      await this.prisma.socialConnection.update({
        where: { id: conn.id },
        data: {
          username: account.username,
          accountType: account.accountType,
          followersCount: account.followersCount,
          mediaCount: account.mediaCount,
          reach30d: totals.reach,
          views30d: totals.views,
          profileViews30d: totals.profileViews,
          metricsUpdatedAt: new Date(),
          status: SocialConnectionStatus.ACTIVE,
          lastSyncedAt: new Date(),
          lastSyncStatus: 'ok',
          lastSyncError: null,
        },
      });

      // Demographics: one row per connection, overwritten each sync.
      await this.prisma.socialAudienceSnapshot.upsert({
        where: { connectionId: conn.id },
        create: {
          connectionId: conn.id,
          creatorProfileId: conn.creatorProfileId,
          platform: SocialPlatform.INSTAGRAM,
          snapshotDate: dateOnly(new Date().toISOString().slice(0, 10)),
          followerCount: account.followersCount,
          ageBreakdown: toJson(demographics.age),
          genderBreakdown: toJson(demographics.gender),
          cityBreakdown: toJson(demographics.city),
          countryBreakdown: toJson(demographics.country),
          raw: toJson(demographics.raw),
          collectedAt: new Date(),
        },
        update: {
          snapshotDate: dateOnly(new Date().toISOString().slice(0, 10)),
          followerCount: account.followersCount,
          ageBreakdown: toJson(demographics.age),
          genderBreakdown: toJson(demographics.gender),
          cityBreakdown: toJson(demographics.city),
          countryBreakdown: toJson(demographics.country),
          raw: toJson(demographics.raw),
          collectedAt: new Date(),
        },
      });

      // Keep the creator's public Instagram URL in sync if the handle changed.
      const igUrl = instagramUrlFromUsername(account.username);
      if (igUrl) {
        await this.prisma.creatorProfile.update({
          where: { id: conn.creatorProfileId },
          data: { instagramUrl: igUrl },
        });
      }
      this.logger.log(
        `social sync ok: instagram connection ${conn.id} (@${account.username ?? '?'})`,
      );
    } catch (err) {
      await this.recordSyncFailure(conn, err);
    }
  }

  private async recordSyncFailure(
    conn: SocialConnection,
    err: unknown,
  ): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
    const authError = err instanceof InstagramApiError && err.isAuthError;
    this.logger.warn(
      `social sync failed: connection ${conn.id}: ${message}${authError ? ' (auth)' : ''}`,
    );
    await this.prisma.socialConnection.update({
      where: { id: conn.id },
      data: {
        status: authError
          ? SocialConnectionStatus.EXPIRED
          : SocialConnectionStatus.ERROR,
        lastSyncStatus: 'error',
        lastSyncError: message.slice(0, 500),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Token maintenance (called by refresh cron + opportunistically on sync)
  // ---------------------------------------------------------------------------

  /** Decrypt the token, refreshing + persisting it if it is near expiry. */
  private async ensureFreshInstagramToken(
    conn: SocialConnection,
  ): Promise<string> {
    const current = decryptSecret(conn.accessToken, this.encKey());
    const nearExpiry =
      conn.tokenExpiresAt != null &&
      conn.tokenExpiresAt.getTime() - Date.now() < TOKEN_REFRESH_THRESHOLD_MS;
    if (!nearExpiry) return current;

    try {
      const refreshed = await this.instagram.refreshToken(current);
      await this.prisma.socialConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: encryptSecret(refreshed.accessToken, this.encKey()),
          tokenExpiresAt: refreshed.expiresAt,
        },
      });
      return refreshed.accessToken;
    } catch (err) {
      this.logger.warn(
        `social token refresh failed for ${conn.id}: ${(err as Error)?.message}`,
      );
      return current; // fall back to the existing token for this run
    }
  }

  /**
   * Connection ids due for a sync: never synced, last synced more than
   * SYNC_INTERVAL_DAYS ago, or currently in ERROR (retry). Used by the cron so
   * each connection refreshes roughly every 3 days rather than daily.
   */
  async listConnectionIdsDueForSync(): Promise<string[]> {
    const staleBefore = new Date(
      Date.now() - SYNC_INTERVAL_DAYS * 24 * 60 * 60_000,
    );
    const rows = await this.prisma.socialConnection.findMany({
      where: {
        OR: [
          {
            status: SocialConnectionStatus.ACTIVE,
            OR: [
              { lastSyncedAt: null },
              { lastSyncedAt: { lte: staleBefore } },
            ],
          },
          { status: SocialConnectionStatus.ERROR },
        ],
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /** Refresh tokens nearing expiry (used by the token-refresh cron). */
  async refreshExpiringTokens(): Promise<number> {
    if (
      !this.instagram.isConfigured() ||
      !this.config.get('SOCIAL_TOKEN_ENC_KEY')
    ) {
      return 0;
    }
    const threshold = new Date(Date.now() + TOKEN_REFRESH_THRESHOLD_MS);
    const due = await this.prisma.socialConnection.findMany({
      where: {
        platform: SocialPlatform.INSTAGRAM,
        status: SocialConnectionStatus.ACTIVE,
        tokenExpiresAt: { not: null, lte: threshold },
      },
    });
    let refreshed = 0;
    for (const conn of due) {
      try {
        await this.ensureFreshInstagramToken(conn);
        refreshed++;
      } catch {
        // logged inside ensureFreshInstagramToken
      }
    }
    return refreshed;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async resolveCreatorProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile?.id) {
      throw new BadRequestException(
        'Creator profile not found. Finish creator profile setup first.',
      );
    }
    return profile.id;
  }
}

function dateOnly(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

/** Canonical public Instagram profile URL from a handle. Null when unknown. */
function instagramUrlFromUsername(username: string | null): string | null {
  const handle = username?.trim().replace(/^@/, '');
  return handle ? `https://instagram.com/${handle}` : null;
}

function toJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value == null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

/** Rank a stored breakdown map into the top-N buckets with population share. */
function topBuckets(
  raw: Prisma.JsonValue,
  limit: number,
): DemographicBucketDto[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const map = raw as DemographicRecord;
  const entries = Object.entries(map).filter(
    ([, v]) => typeof v === 'number' && Number.isFinite(v),
  );
  if (!entries.length) return [];
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({
      key,
      value,
      share: total > 0 ? Number((value / total).toFixed(4)) : undefined,
    }));
}
