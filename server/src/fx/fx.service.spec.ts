import type { ConfigService } from '@nestjs/config';

import { FxService } from './fx.service';

/**
 * This decides what a creator's price becomes in rupees, so the arithmetic
 * and the failure paths both matter: a wrong rate misprices real orders, and
 * an unavailable upstream must not stop someone saving a price at all.
 */
const RATES = { USD: 0.0107, GBP: 0.008, EUR: 0.0096 };

function build(fetchImpl: jest.Mock) {
  global.fetch = fetchImpl as unknown as typeof fetch;
  return new FxService({
    get: () => undefined,
  } as unknown as ConfigService);
}

const ok = (body: unknown) =>
  jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });

describe('FxService', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('converts into rupees using the reciprocal of the published rate', async () => {
    // The upstream gives units-per-1-INR, so rupees is 1/rate per unit.
    const fx = build(ok({ base: 'INR', date: '2026-11-11', rates: RATES }));
    const result = await fx.convertToInr(100, 'USD');
    expect(result?.inr).toBeCloseTo(9345.79, 2);
    expect(result?.rate).toBeCloseTo(1 / 0.0107, 4);
    expect(result?.date).toBe('2026-11-11');
  });

  it('treats INR as itself without calling out', async () => {
    const fetchMock = ok({ rates: RATES });
    const fx = build(fetchMock);
    const result = await fx.convertToInr(5000, 'INR');
    expect(result).toEqual({ inr: 5000, rate: 1, date: '' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is case-insensitive about the currency code', async () => {
    const fx = build(ok({ date: '', rates: RATES }));
    const lower = await fx.convertToInr(10, 'usd');
    const upper = await fx.convertToInr(10, 'USD');
    expect(lower?.inr).toBe(upper?.inr);
  });

  it('returns null for a currency the upstream does not carry', async () => {
    // Frankfurter covers the ECB set only — no PKR, AED or SAR — and this
    // product has creators in Pakistan. The caller asks for rupees instead
    // of inventing a rate.
    const fx = build(ok({ date: '', rates: RATES }));
    expect(await fx.convertToInr(100, 'PKR')).toBeNull();
    expect(await fx.convertToInr(100, 'AED')).toBeNull();
  });

  it('rejects nonsense amounts rather than storing one', async () => {
    const fx = build(ok({ date: '', rates: RATES }));
    expect(await fx.convertToInr(Number.NaN, 'USD')).toBeNull();
    expect(await fx.convertToInr(-1, 'USD')).toBeNull();
    expect(await fx.convertToInr(100, '')).toBeNull();
  });

  it('fetches once and serves the rest from cache', async () => {
    const fetchMock = ok({ date: '', rates: RATES });
    const fx = build(fetchMock);
    await fx.convertToInr(1, 'USD');
    await fx.convertToInr(2, 'GBP');
    await fx.getInrRates();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('makes one upstream call for concurrent cold reads', async () => {
    const fetchMock = ok({ date: '', rates: RATES });
    const fx = build(fetchMock);
    await Promise.all([fx.getInrRates(), fx.getInrRates(), fx.getInrRates()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves the last good rates, flagged stale, when a refresh fails', async () => {
    const fetchMock = ok({ date: '2026-11-11', rates: RATES });
    const fx = build(fetchMock);
    await fx.getInrRates();

    // Expire the cache, then break the upstream.
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 60 * 60_000);
    fetchMock.mockRejectedValue(new Error('upstream down'));

    const rates = await fx.getInrRates();
    expect(rates?.stale).toBe(true);
    expect(rates?.rates.USD).toBe(RATES.USD);
  });

  it('returns null when it has never succeeded, so pricing still works', async () => {
    // Null is an answer, not a crash: the form falls back to a rupee field.
    const fx = build(jest.fn().mockRejectedValue(new Error('offline')));
    expect(await fx.getInrRates()).toBeNull();
    expect(await fx.convertToInr(100, 'USD')).toBeNull();
    expect(await fx.supportedCurrencies()).toEqual(['INR']);
  });

  it('treats an empty rates payload as a failure', async () => {
    const fx = build(ok({ date: '2026-11-11', rates: {} }));
    expect(await fx.getInrRates()).toBeNull();
  });

  it('lists what it can convert, INR included', async () => {
    const fx = build(ok({ date: '', rates: RATES }));
    expect(await fx.supportedCurrencies()).toEqual(['EUR', 'GBP', 'INR', 'USD']);
  });
});
