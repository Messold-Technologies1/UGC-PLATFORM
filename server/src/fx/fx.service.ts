import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Exchange rates, for creators who price in their own currency.
 *
 * INR is the base everywhere: `CreatorPackage.priceAmount` stays rupees and
 * stays the number orders, fees, payouts and the browse price filter are
 * built on. This only decides what a non-Indian creator's entered amount
 * becomes when it is stored.
 *
 * The rate is applied SERVER-side on save. A client-computed figure would be
 * a price the creator could set to anything by editing a request.
 */

/** Rates expressed as "how many of this currency per 1 INR". */
export interface InrRates {
  /** Date the upstream published these, `YYYY-MM-DD`. */
  date: string;
  rates: Record<string, number>;
  /** True when served from the cache after an upstream failure. */
  stale: boolean;
}

interface FrankfurterResponse {
  base?: string;
  date?: string;
  rates?: Record<string, number>;
}

/** Refetch at most this often; rates move daily, not by the minute. */
const CACHE_TTL_MS = 12 * 60 * 60_000;
/** Upstream is a convenience, not a dependency — fail fast and fall back. */
const REQUEST_TIMEOUT_MS = 5_000;

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private cached: InrRates | null = null;
  private cachedAt = 0;
  /** De-duplicates concurrent refreshes so a cold cache makes one call. */
  private inFlight: Promise<InrRates | null> | null = null;

  constructor(private readonly config: ConfigService) {}

  private endpoint(): string {
    return (
      this.config.get<string>('FX_RATES_URL')?.trim() ||
      'https://api.frankfurter.dev/v1/latest?base=INR'
    );
  }

  /**
   * Current rates, or null if they have never been fetched successfully.
   *
   * Null is a real answer, not an error: the caller shows the plain rupee
   * field instead of a converter. Better than blocking a creator from
   * setting a price because a third party is down.
   */
  async getInrRates(): Promise<InrRates | null> {
    const fresh = Date.now() - this.cachedAt < CACHE_TTL_MS;
    if (this.cached && fresh) return this.cached;

    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<InrRates | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let body: FrankfurterResponse;
      try {
        const res = await fetch(this.endpoint(), {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        body = (await res.json()) as FrankfurterResponse;
      } finally {
        clearTimeout(timer);
      }

      const rates = body.rates ?? {};
      if (Object.keys(rates).length === 0) {
        throw new Error('no rates in response');
      }

      this.cached = { date: body.date ?? '', rates, stale: false };
      this.cachedAt = Date.now();
      return this.cached;
    } catch (err) {
      const reason = (err as Error)?.message ?? 'unknown error';
      if (this.cached) {
        // Serving yesterday's rate beats refusing to save a price.
        this.logger.warn(
          `fx: refresh failed (${reason}); serving rates from ${this.cached.date}`,
        );
        return { ...this.cached, stale: true };
      }
      this.logger.warn(
        `fx: refresh failed (${reason}) and nothing is cached; ` +
          'creators will be asked for a rupee price directly.',
      );
      return null;
    }
  }

  /** Currencies the upstream can convert, uppercased. INR is always one. */
  async supportedCurrencies(): Promise<string[]> {
    const rates = await this.getInrRates();
    if (!rates) return ['INR'];
    return ['INR', ...Object.keys(rates.rates)].sort();
  }

  /**
   * Convert `amount` of `currency` into rupees, rounded to paise.
   *
   * Returns null when the currency is one the upstream does not carry —
   * AED, PKR and the Gulf currencies among them — so the caller can ask for
   * a rupee figure rather than inventing a rate.
   */
  async convertToInr(
    amount: number,
    currency: string,
  ): Promise<{ inr: number; rate: number; date: string } | null> {
    const code = currency?.trim().toUpperCase();
    if (!code || !Number.isFinite(amount) || amount < 0) return null;
    if (code === 'INR') {
      return { inr: round2(amount), rate: 1, date: '' };
    }

    const rates = await this.getInrRates();
    const perInr = rates?.rates[code];
    if (!rates || !perInr || perInr <= 0) return null;

    // `rates` is units-of-currency per 1 INR, so rupees is the reciprocal.
    const inrPerUnit = 1 / perInr;
    return {
      inr: round2(amount * inrPerUnit),
      rate: inrPerUnit,
      date: rates.date,
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
