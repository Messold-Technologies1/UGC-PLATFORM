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
    /**
     * Graph rate-limited the request (429, or app/user request-limit codes
     * 4/17) rather than genuinely failing it. Callers should retry with
     * backoff instead of treating this as a broken connection — see
     * SocialConnectionsService.syncConnection.
     */
    readonly rateLimited = false,
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }

  /** OAuth code 190 = token expired/invalid/revoked → connection needs reconnect. */
  get isAuthError(): boolean {
    return this.code === 190;
  }
}

/** One media item as returned by `GET /me/media`. */
export interface InstagramMediaNode {
  id: string;
  mediaType: string;
  /** REELS | FEED | AD. Absent on older media. */
  mediaProductType: string | null;
  /** Short-lived signed CDN URL. Never durable. */
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  caption: string | null;
  postedAt: Date | null;
  likeCount: number | null;
  commentsCount: number | null;
}

export interface InstagramMediaPage {
  items: InstagramMediaNode[];
  /** Graph's `paging.cursors.after`; null when the walk is done. */
  nextCursor: string | null;
  /** Usage telemetry from the response headers, when Meta sent any. */
  usage: InstagramUsage | null;
}

/**
 * Meta's rate-limit telemetry. Each figure is a *percentage* of the allowance,
 * not an absolute count, which is why we steer by these rather than by a
 * hard-coded quota — the formula has changed more than once and differs between
 * the Instagram-Login and Facebook-Login variants.
 */
export interface InstagramUsage {
  callCountPct: number;
  totalCpuTimePct: number;
  totalTimePct: number;
  /** Minutes Meta says to wait, when it has throttled us. */
  estimatedTimeToRegainAccessMin: number | null;
}

/** The worst figure across every usage header on a response. */
export function peakUsagePct(usage: InstagramUsage | null): number {
  if (!usage) return 0;
  return Math.max(
    usage.callCountPct,
    usage.totalCpuTimePct,
    usage.totalTimePct,
  );
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
      throw this.toError(shortRes, shortData, 'Instagram code exchange failed');
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
      throw this.toError(
        longRes,
        longData,
        'Instagram long-lived exchange failed',
      );
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
      throw this.toError(res, data, 'Instagram token refresh failed');
    }
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
    };
  }

  /**
   * One page of the creator's media, newest first.
   *
   * `/me/media` has no server-side type filter, so reels are separated from
   * photos and carousels by the caller. `media_product_type` is requested so
   * that filter can be exact rather than inferred from `media_type`.
   */
  async fetchMediaPage(
    accessToken: string,
    cursor?: string | null,
    limit = 25,
  ): Promise<InstagramMediaPage> {
    const url = new URL(`${GRAPH_BASE}/${this.version()}/me/media`);
    url.searchParams.set(
      'fields',
      [
        'id',
        'media_type',
        'media_product_type',
        'media_url',
        'thumbnail_url',
        'permalink',
        'caption',
        'timestamp',
        'like_count',
        'comments_count',
      ].join(','),
    );
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('after', cursor);
    url.searchParams.set('access_token', accessToken);

    const res = await this.timedFetch('media page', url);
    const usage = parseUsageHeaders(res);
    const data = (await res.json()) as {
      data?: Array<{
        id?: string;
        media_type?: string;
        media_product_type?: string;
        media_url?: string;
        thumbnail_url?: string;
        permalink?: string;
        caption?: string;
        timestamp?: string;
        like_count?: number;
        comments_count?: number;
      }>;
      paging?: { cursors?: { after?: string }; next?: string };
    } & GraphError;

    if (!res.ok) {
      const err = this.toError(res, data, 'Instagram media fetch failed');
      // 429 with a wait hint: surface it so the queue can honour the exact
      // cool-down rather than guessing a backoff. rateLimited itself is now
      // set by toError, shared with every other Graph call.
      throw Object.assign(err, { usage });
    }

    const items: InstagramMediaNode[] = (data.data ?? [])
      .filter((n): n is typeof n & { id: string } => Boolean(n.id))
      .map((n) => ({
        id: String(n.id),
        mediaType: n.media_type ?? 'UNKNOWN',
        mediaProductType: n.media_product_type ?? null,
        mediaUrl: n.media_url ?? null,
        thumbnailUrl: n.thumbnail_url ?? null,
        permalink: n.permalink ?? null,
        caption: n.caption ?? null,
        postedAt: n.timestamp ? new Date(n.timestamp) : null,
        likeCount: numOrNull(n.like_count),
        commentsCount: numOrNull(n.comments_count),
      }));

    // Only treat the cursor as live when Graph also gave us a `next` link.
    // `cursors.after` is present on the last page too, and following it would
    // loop forever over an empty result.
    const nextCursor = data.paging?.next
      ? (data.paging?.cursors?.after ?? null)
      : null;

    return { items, nextCursor, usage };
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
      throw this.toError(res, data, 'Instagram account fetch failed');
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
            throw this.toError(
              res,
              data,
              'Instagram demographics fetch failed',
            );
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
          throw this.toError(res, data, `Instagram ${metric} fetch failed`);
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

  /**
   * `res` is required (even though most callers only use it for the status
   * code) so rate-limit detection lives in one place instead of being
   * reimplemented — and forgotten — at each call site.
   */
  private toError(
    res: Response,
    body: GraphError,
    fallback: string,
  ): InstagramApiError {
    const e = body.error;
    return new InstagramApiError(
      e?.message ?? fallback,
      e?.code,
      e?.error_subcode,
      isRateLimited(res, e?.code),
    );
  }
}

/**
 * Meta's signal for "you're being throttled, not rejected": an HTTP 429, or
 * error codes 4 (app-level request limit) / 17 (user-level request limit).
 * Shared by every Graph call so a rate limit is never mistaken for a broken
 * token or a dead connection.
 */
function isRateLimited(res: Response, code?: number): boolean {
  return res.status === 429 || code === 4 || code === 17;
}

/**
 * Read `x-app-usage` and `X-Business-Use-Case-Usage`. Both are JSON strings and
 * either may be absent, so every field degrades to 0 rather than throwing — a
 * missing header must never block a sync.
 */
function parseUsageHeaders(res: Response): InstagramUsage | null {
  const app = safeJson(res.headers.get('x-app-usage'));
  const buc = safeJson(res.headers.get('x-business-use-case-usage'));

  // The BUC header is keyed by account id; take the worst entry across accounts.
  let bucCall = 0;
  let bucCpu = 0;
  let bucTime = 0;
  let regain: number | null = null;
  if (buc && typeof buc === 'object') {
    for (const entries of Object.values(buc as Record<string, unknown>)) {
      for (const e of Array.isArray(entries) ? entries : []) {
        const rec = e as Record<string, unknown>;
        bucCall = Math.max(bucCall, pct(rec.call_count));
        bucCpu = Math.max(bucCpu, pct(rec.total_cputime));
        bucTime = Math.max(bucTime, pct(rec.total_time));
        const wait = pct(rec.estimated_time_to_regain_access);
        if (wait > 0) regain = Math.max(regain ?? 0, wait);
      }
    }
  }

  const appRec = (app ?? {}) as Record<string, unknown>;
  const usage: InstagramUsage = {
    callCountPct: Math.max(pct(appRec.call_count), bucCall),
    totalCpuTimePct: Math.max(pct(appRec.total_cputime), bucCpu),
    totalTimePct: Math.max(pct(appRec.total_time), bucTime),
    estimatedTimeToRegainAccessMin: regain,
  };

  const sawAnything = app != null || buc != null;
  return sawAnything ? usage : null;
}

function safeJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pct(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
