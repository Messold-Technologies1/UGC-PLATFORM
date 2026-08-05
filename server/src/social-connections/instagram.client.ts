import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin client for "Instagram API with Instagram Login" (Professional accounts,
 * no Facebook Page required). Uses the manual-`fetch` style already used for
 * Google OAuth in AuthService rather than pulling in a Passport strategy.
 *
 * Every insight/demographic call is isolated so one failing metric (e.g. an
 * account with <100 followers has no `follower_demographics`) never aborts the
 * whole sync — callers get `null` for the parts that failed.
 */

const OAUTH_AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
const OAUTH_ACCESS_TOKEN = 'https://api.instagram.com/oauth/access_token';
const GRAPH_BASE = 'https://graph.instagram.com';

const SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_insights',
];

/** Demographic breakdown dimensions we pull (one call each). */
const DEMOGRAPHIC_BREAKDOWNS = ['age', 'gender', 'city', 'country'] as const;

/**
 * Per-request cap for Graph calls. Node's global fetch only applies undici's
 * ~5 min header/body defaults, so a stalled Graph call would keep a BullMQ job
 * in `active` with no logs for many minutes (a sync makes up to 8 calls).
 */
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export class InstagramApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }

  /** OAuth code 190 = token expired/invalid/revoked → connection needs reconnect. */
  get isAuthError(): boolean {
    return this.code === 190;
  }
}

export interface InstagramTokenResult {
  accessToken: string;
  userId: string;
  /** Absolute expiry of the long-lived token. */
  expiresAt: Date | null;
  scopes: string[];
}

export interface InstagramAccount {
  userId: string;
  username: string | null;
  accountType: string | null;
  followersCount: number | null;
  mediaCount: number | null;
}

/** Rolling-window totals for a connection (de-duplicated reach). */
export interface InstagramTotals {
  reach: number | null;
  views: number | null;
  profileViews: number | null;
}

export type DemographicMap = Record<string, number>;

export interface InstagramDemographics {
  age: DemographicMap | null;
  gender: DemographicMap | null;
  city: DemographicMap | null;
  country: DemographicMap | null;
  raw: unknown;
}

interface GraphError {
  error?: { message: string; code?: number; error_subcode?: number };
}

interface InsightsResponse {
  data?: Array<{
    name: string;
    period: string;
    values?: Array<{ value: unknown; end_time?: string }>;
    total_value?: {
      value?: number;
      breakdowns?: Array<{
        dimension_keys?: string[];
        results?: Array<{ dimension_values?: string[]; value?: number }>;
      }>;
    };
  }>;
}

@Injectable()
export class InstagramClient {
  private readonly logger = new Logger(InstagramClient.name);

  constructor(private readonly config: ConfigService) {}

  private version(): string {
    return this.config.get<string>('INSTAGRAM_GRAPH_VERSION', 'v21.0');
  }

  private requestTimeoutMs(): number {
    return Number(
      this.config.get(
        'INSTAGRAM_REQUEST_TIMEOUT_MS',
        DEFAULT_REQUEST_TIMEOUT_MS,
      ),
    );
  }

  /**
   * `fetch` with an abort timeout plus a start/finish log line, so a slow or
   * hanging Graph call is visible and can never stall a sync indefinitely.
   */
  private async timedFetch(
    label: string,
    input: URL | string,
    init?: RequestInit,
  ): Promise<Response> {
    const timeoutMs = this.requestTimeoutMs();
    const startedAt = Date.now();
    this.logger.log(
      `instagram ${label}: request start (timeout=${timeoutMs}ms)`,
    );
    try {
      const res = await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      this.logger.log(
        `instagram ${label}: response ${res.status} in ${Date.now() - startedAt}ms`,
      );
      return res;
    } catch (err) {
      const elapsed = Date.now() - startedAt;
      const reason =
        (err as Error)?.name === 'TimeoutError'
          ? `timed out after ${timeoutMs}ms`
          : (err as Error)?.message;
      this.logger.warn(
        `instagram ${label}: request failed in ${elapsed}ms — ${reason}`,
      );
      throw new InstagramApiError(
        `Instagram ${label} request failed: ${reason}`,
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('INSTAGRAM_CLIENT_ID') &&
      this.config.get<string>('INSTAGRAM_CLIENT_SECRET') &&
      this.config.get<string>('INSTAGRAM_CALLBACK_URL'),
    );
  }

  getAuthUrl(state: string): string {
    const clientId = this.config.get<string>('INSTAGRAM_CLIENT_ID')!;
    const redirectUri = this.config.get<string>('INSTAGRAM_CALLBACK_URL')!;
    const params = new URLSearchParams({
      // Force the Instagram account chooser / re-login so a creator can pick
      // which professional account to link (matches Meta's suggested embed URL).
      force_reauth: 'true',
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(','),
      state,
    });
    return `${OAUTH_AUTHORIZE}?${params.toString()}`;
  }

  /** Exchange the authorization code for a long-lived (~60 day) token. */
  async exchangeCode(code: string): Promise<InstagramTokenResult> {
    const clientId = this.config.get<string>('INSTAGRAM_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('INSTAGRAM_CLIENT_SECRET')!;
    const redirectUri = this.config.get<string>('INSTAGRAM_CALLBACK_URL')!;

    // 1) short-lived token
    const shortRes = await this.timedFetch(
      'code exchange',
      OAUTH_ACCESS_TOKEN,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code,
        }),
      },
    );
    const shortData = (await shortRes.json()) as {
      access_token?: string;
      user_id?: number | string;
      permissions?: string[];
    } & GraphError;
    if (!shortRes.ok || !shortData.access_token) {
      throw this.toError(shortData, 'Instagram code exchange failed');
    }

    // 2) exchange for long-lived token
    const longUrl = new URL(`${GRAPH_BASE}/access_token`);
    longUrl.searchParams.set('grant_type', 'ig_exchange_token');
    longUrl.searchParams.set('client_secret', clientSecret);
    longUrl.searchParams.set('access_token', shortData.access_token);
    const longRes = await this.timedFetch('long-lived exchange', longUrl);
    const longData = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
    } & GraphError;
    if (!longRes.ok || !longData.access_token) {
      throw this.toError(longData, 'Instagram long-lived exchange failed');
    }

    return {
      accessToken: longData.access_token,
      userId: String(shortData.user_id ?? ''),
      expiresAt: longData.expires_in
        ? new Date(Date.now() + longData.expires_in * 1000)
        : null,
      scopes: shortData.permissions ?? SCOPES,
    };
  }

  /** Refresh a long-lived token (valid once it is >24h old, before 60d expiry). */
  async refreshToken(
    accessToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date | null }> {
    const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
    url.searchParams.set('grant_type', 'ig_refresh_token');
    url.searchParams.set('access_token', accessToken);
    const res = await this.timedFetch('token refresh', url);
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    } & GraphError;
    if (!res.ok || !data.access_token) {
      throw this.toError(data, 'Instagram token refresh failed');
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
    };
  }

  async fetchAccount(accessToken: string): Promise<InstagramAccount> {
    const url = new URL(`${GRAPH_BASE}/${this.version()}/me`);
    url.searchParams.set(
      'fields',
      'user_id,username,account_type,followers_count,media_count',
    );
    url.searchParams.set('access_token', accessToken);
    const res = await this.timedFetch('account fetch', url);
    const data = (await res.json()) as {
      user_id?: string;
      id?: string;
      username?: string;
      account_type?: string;
      followers_count?: number;
      media_count?: number;
    } & GraphError;
    if (!res.ok || (!data.user_id && !data.id)) {
      throw this.toError(data, 'Instagram account fetch failed');
    }
    return {
      userId: String(data.user_id ?? data.id),
      username: data.username ?? null,
      accountType: data.account_type ?? null,
      followersCount: numOrNull(data.followers_count),
      mediaCount: numOrNull(data.media_count),
    };
  }

  /**
   * Single rolling-window totals (default 30 days). Uses `metric_type=total_value`
   * so `reach` comes back **de-duplicated** over the whole window (summing daily
   * reach would double-count repeat viewers). Each metric is fetched
   * independently; a failure yields null for that field.
   */
  async fetch30DayTotals(
    accessToken: string,
    windowDays = 30,
  ): Promise<InstagramTotals> {
    const until = Math.floor(Date.now() / 1000);
    const since = until - windowDays * 24 * 60 * 60;
    const [reach, views, profileViews] = await Promise.all([
      this.fetchTotalValue(accessToken, 'reach', since, until),
      this.fetchTotalValue(accessToken, 'views', since, until),
      this.fetchTotalValue(accessToken, 'profile_views', since, until),
    ]);
    return { reach, views, profileViews };
  }

  /** Follower demographics (period=lifetime). Needs >=100 followers. */
  async fetchDemographics(accessToken: string): Promise<InstagramDemographics> {
    const out: InstagramDemographics = {
      age: null,
      gender: null,
      city: null,
      country: null,
      raw: {},
    };
    const raw: Record<string, unknown> = {};

    for (const breakdown of DEMOGRAPHIC_BREAKDOWNS) {
      try {
        const url = new URL(`${GRAPH_BASE}/${this.version()}/me/insights`);
        url.searchParams.set('metric', 'follower_demographics');
        url.searchParams.set('period', 'lifetime');
        url.searchParams.set('metric_type', 'total_value');
        url.searchParams.set('breakdown', breakdown);
        url.searchParams.set('access_token', accessToken);
        const res = await this.timedFetch(`demographics ${breakdown}`, url);
        const data = (await res.json()) as InsightsResponse & GraphError;
        if (!res.ok) {
          if (data.error?.code === 190) {
            throw this.toError(data, 'Instagram demographics fetch failed');
          }
          // e.g. <100 followers / not enough data — skip this breakdown.
          this.logger.debug(
            `instagram demographics ${breakdown} skipped: ${data.error?.message}`,
          );
          continue;
        }
        raw[breakdown] = data.data;
        out[breakdown] = parseBreakdown(data);
      } catch (err) {
        if (err instanceof InstagramApiError && err.isAuthError) throw err;
        this.logger.warn(
          `instagram demographics ${breakdown} failed: ${(err as Error)?.message}`,
        );
      }
    }

    out.raw = raw;
    return out;
  }

  /** Single de-duplicated total for one metric over [sinceUnix, untilUnix). */
  private async fetchTotalValue(
    accessToken: string,
    metric: string,
    sinceUnix: number,
    untilUnix: number,
  ): Promise<number | null> {
    try {
      const url = new URL(`${GRAPH_BASE}/${this.version()}/me/insights`);
      url.searchParams.set('metric', metric);
      url.searchParams.set('period', 'day');
      url.searchParams.set('metric_type', 'total_value');
      url.searchParams.set('since', String(sinceUnix));
      url.searchParams.set('until', String(untilUnix));
      url.searchParams.set('access_token', accessToken);
      const res = await this.timedFetch(`insights ${metric}`, url);
      const data = (await res.json()) as InsightsResponse & GraphError;
      if (!res.ok) {
        if (data.error?.code === 190) {
          throw this.toError(data, `Instagram ${metric} fetch failed`);
        }
        this.logger.debug(
          `instagram metric ${metric} skipped: ${data.error?.message}`,
        );
        return null;
      }
      return numOrNull(data.data?.[0]?.total_value?.value);
    } catch (err) {
      if (err instanceof InstagramApiError && err.isAuthError) throw err;
      this.logger.warn(
        `instagram metric ${metric} failed: ${(err as Error)?.message}`,
      );
      return null;
    }
  }

  private toError(body: GraphError, fallback: string): InstagramApiError {
    const e = body.error;
    return new InstagramApiError(
      e?.message ?? fallback,
      e?.code,
      e?.error_subcode,
    );
  }
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function parseBreakdown(data: InsightsResponse): DemographicMap | null {
  const results = data.data?.[0]?.total_value?.breakdowns?.[0]?.results;
  if (!results?.length) return null;
  const map: DemographicMap = {};
  for (const r of results) {
    const key = r.dimension_values?.[0];
    if (key != null && typeof r.value === 'number') {
      map[key] = r.value;
    }
  }
  return Object.keys(map).length ? map : null;
}
