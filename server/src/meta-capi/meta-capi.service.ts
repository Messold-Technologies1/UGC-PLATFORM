import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

/**
 * User identity + attribution data for a Conversions API event. Everything is
 * optional; more fields = higher Event Match Quality. Email/phone are hashed
 * here before they leave the process.
 */
export interface MetaCapiUserData {
  email?: string | null;
  phone?: string | null;
  /** Meta _fbp browser cookie captured at signup. */
  fbp?: string | null;
  /** Meta _fbc ad-click cookie captured at signup. */
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
}

export interface MetaCapiEvent {
  eventName: string;
  /** Stable id for browser/server deduplication. */
  eventId?: string;
  /** Unix seconds. Defaults to now. Must be within the last 7 days. */
  eventTime?: number;
  userData: MetaCapiUserData;
  customData?: Record<string, unknown>;
}

/**
 * Server-side Meta (Facebook) Conversions API client.
 *
 * Self-contained and best-effort: when META_CAPI_ACCESS_TOKEN or
 * META_CAPI_DATASET_ID is unset the service is disabled and every call is a
 * silent no-op (the server-side kill switch). Callers should fire-and-forget —
 * `sendEvent` never throws.
 *
 * Removal later: delete this module, drop the MetaCapiModule import in
 * app.module.ts, and remove the single call site in creator-profile.service.ts.
 */
@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);
  private readonly accessToken: string;
  private readonly datasetId: string;
  private readonly apiVersion: string;
  private readonly testEventCode?: string;

  constructor(private readonly config: ConfigService) {
    this.accessToken =
      this.config.get<string>('META_CAPI_ACCESS_TOKEN')?.trim() ?? '';
    this.datasetId =
      this.config.get<string>('META_CAPI_DATASET_ID')?.trim() ?? '';
    this.apiVersion =
      this.config.get<string>('META_CAPI_API_VERSION')?.trim() || 'v21.0';
    this.testEventCode =
      this.config.get<string>('META_CAPI_TEST_EVENT_CODE')?.trim() || undefined;
  }

  get enabled(): boolean {
    return Boolean(this.accessToken && this.datasetId);
  }

  /** SHA-256 of a normalized (trimmed, lowercased) value, per Meta's spec. */
  private hash(value: string | null | undefined): string | undefined {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return undefined;
    return createHash('sha256').update(normalized).digest('hex');
  }

  /** Normalize a phone to digits-only before hashing (keeps country code). */
  private hashPhone(value: string | null | undefined): string | undefined {
    const digits = value?.replace(/[^\d]/g, '');
    if (!digits) return undefined;
    return createHash('sha256').update(digits).digest('hex');
  }

  private buildUserData(user: MetaCapiUserData): Record<string, unknown> {
    const em = this.hash(user.email);
    const ph = this.hashPhone(user.phone);
    return {
      ...(em ? { em: [em] } : {}),
      ...(ph ? { ph: [ph] } : {}),
      ...(user.fbp ? { fbp: user.fbp } : {}),
      ...(user.fbc ? { fbc: user.fbc } : {}),
      ...(user.clientIpAddress
        ? { client_ip_address: user.clientIpAddress }
        : {}),
      ...(user.clientUserAgent
        ? { client_user_agent: user.clientUserAgent }
        : {}),
    };
  }

  /**
   * Send a single event to the Conversions API. Best-effort: logs and swallows
   * all errors so it can never break the caller's flow.
   */
  async sendEvent(event: MetaCapiEvent): Promise<void> {
    if (!this.enabled) return;

    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
          action_source: 'system_generated' as const,
          ...(event.eventId ? { event_id: event.eventId } : {}),
          user_data: this.buildUserData(event.userData),
          ...(event.customData ? { custom_data: event.customData } : {}),
        },
      ],
      ...(this.testEventCode ? { test_event_code: this.testEventCode } : {}),
    };

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.datasetId}/events?access_token=${encodeURIComponent(
      this.accessToken,
    )}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.logger.warn(
          `Meta CAPI ${event.eventName} rejected (${res.status}): ${JSON.stringify(body)}`,
        );
        return;
      }
      const received = (body as { events_received?: number }).events_received;
      const trace = (body as { fbtrace_id?: string }).fbtrace_id;
      this.logger.log(
        `Meta CAPI ${event.eventName} accepted: events_received=${received} fbtrace_id=${trace}`,
      );
    } catch (error) {
      this.logger.warn(
        `Meta CAPI ${event.eventName} request failed: ${(error as Error).message}`,
      );
    }
  }
}
