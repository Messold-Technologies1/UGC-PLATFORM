import { MetaCapiService } from './meta-capi.service';

type Env = Record<string, string | undefined>;

function buildService(env: Env): MetaCapiService {
  const config = {
    get: (key: string): string | undefined => env[key],
  };
  return new MetaCapiService(config as never);
}

const CREATOR_ENV: Env = {
  META_CAPI_ACCESS_TOKEN: 'creator-token',
  META_CAPI_DATASET_ID: '1111',
};
const BOTH_ENV: Env = {
  ...CREATOR_ENV,
  META_CAPI_BRAND_DATASET_ID: '2222',
  META_CAPI_BRAND_ACCESS_TOKEN: 'brand-token',
};

describe('MetaCapiService dataset routing', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ events_received: 1 }),
    });
    global.fetch = fetchMock as never;
  });

  /** The URL a send hit, so tests can assert dataset + token. */
  function sentUrl(): string {
    return String(fetchMock.mock.calls[0][0]);
  }

  it('enables a dataset only when it has both an ID and a token', () => {
    const both = buildService(BOTH_ENV);
    expect(both.enabledFor('creator')).toBe(true);
    expect(both.enabledFor('brand')).toBe(true);

    const creatorOnly = buildService(CREATOR_ENV);
    expect(creatorOnly.enabledFor('creator')).toBe(true);
    expect(creatorOnly.enabledFor('brand')).toBe(false);

    const noToken = buildService({ META_CAPI_DATASET_ID: '1111' });
    expect(noToken.enabledFor('creator')).toBe(false);
    expect(noToken.enabled).toBe(false);
  });

  it('posts a brand event to the brand dataset with the brand token', async () => {
    await buildService(BOTH_ENV).sendEvent({
      audience: 'brand',
      eventName: 'BrandRegistration',
      userData: { email: 'brand@example.com' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentUrl()).toContain('/2222/events');
    expect(sentUrl()).toContain('access_token=brand-token');
  });

  it('defaults to the creator dataset when no audience is given', async () => {
    await buildService(BOTH_ENV).sendEvent({
      eventName: 'CreatorProfileListed',
      userData: { email: 'creator@example.com' },
    });

    expect(sentUrl()).toContain('/1111/events');
    expect(sentUrl()).toContain('access_token=creator-token');
  });

  it('reuses the creator token for the brand dataset when no brand token is set', async () => {
    await buildService({
      ...CREATOR_ENV,
      META_CAPI_BRAND_DATASET_ID: '2222',
    }).sendEvent({
      audience: 'brand',
      eventName: 'BrandRegistration',
      userData: { email: 'brand@example.com' },
    });

    expect(sentUrl()).toContain('/2222/events');
    expect(sentUrl()).toContain('access_token=creator-token');
  });

  it('is a no-op for a dataset that is not configured', async () => {
    // Creator dataset configured, brand one not: the brand event is dropped
    // rather than leaking into the creator dataset.
    await buildService(CREATOR_ENV).sendEvent({
      audience: 'brand',
      eventName: 'BrandRegistration',
      userData: { email: 'brand@example.com' },
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the shared event id and hashed identifiers, and never throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const service = buildService(BOTH_ENV);

    await expect(
      service.sendEvent({
        audience: 'brand',
        eventName: 'BrandRegistration',
        eventId: 'brand-registration-bp_123',
        actionSource: 'website',
        userData: { email: 'Brand@Example.com ', phone: '+91 98123 45678' },
        customData: { brand_name: 'Acme' },
      }),
    ).resolves.toBeUndefined();

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as {
      data: Array<{
        event_id: string;
        action_source: string;
        user_data: { em: string[]; ph: string[] };
        custom_data: Record<string, unknown>;
      }>;
    };
    const [event] = body.data;
    expect(event.event_id).toBe('brand-registration-bp_123');
    expect(event.action_source).toBe('website');
    expect(event.custom_data).toEqual({ brand_name: 'Acme' });
    // Normalized (trimmed/lowercased, digits-only) then SHA-256 hex.
    expect(event.user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(event.user_data.ph[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(event.user_data)).not.toContain('Brand@Example.com');
  });
});
