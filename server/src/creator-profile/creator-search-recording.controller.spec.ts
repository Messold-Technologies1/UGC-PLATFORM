import { CreatorProfileController } from './creator-profile.controller';
import type { CreatorSearchAnalyticsService } from './creator-search-analytics.service';
import type { CreatorProfileService } from './creator-profile.service';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';

describe('listCreators recording', () => {
  function setup() {
    const record = jest.fn();
    const listCreators = jest
      .fn()
      .mockResolvedValue({ items: [], total: 4, page: 1, limit: 20 });
    // listCreators only reaches the first and last constructor arguments. The
    // middle ones are written out rather than spread from Array(n).fill():
    // a spread has no tuple type, so `tsc --noEmit` rejects it against a
    // fixed-arity constructor even though Jest runs it happily — which is
    // exactly how it passed here and failed in CI.
    const unused = {} as never;
    const controller = new CreatorProfileController(
      { listCreators } as unknown as CreatorProfileService,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      { record } as unknown as CreatorSearchAnalyticsService,
    );
    return { controller, record };
  }

  const req = (over: Record<string, unknown> = {}) =>
    ({ headers: {}, cookies: {}, ...over }) as never;
  const q = (o: Partial<ListCreatorsQueryDto> = {}) => o as ListCreatorsQueryDto;

  it('does NOT record the browse page server-side prefetch', async () => {
    // It carries no cookies (its response is cached and shared), so it looked
    // like an anonymous visitor running an unfiltered search on every page
    // load — which nobody signed out can actually do.
    const { controller, record } = setup();

    await controller.listCreators(
      q(),
      req({ headers: { 'x-gocollab-prefetch': '1' } }),
    );

    expect(record).not.toHaveBeenCalled();
  });

  it('records a real browse request', async () => {
    const { controller, record } = setup();

    await controller.listCreators(q({ city: 'Mumbai' }), req());

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ resultCount: 4, hadLapsedSession: false }),
    );
  });

  it('flags a request whose access token did not verify', async () => {
    const { controller, record } = setup();

    // The guard attached no user, but a token was sent: a signed-in brand
    // whose 15-minute token aged out mid-session.
    await controller.listCreators(
      q({ city: 'Mumbai' }),
      req({ cookies: { accessToken: 'stale.jwt.value' } }),
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ hadLapsedSession: true }),
    );
  });

  it('does not record page 2 of an infinite scroll', async () => {
    const { controller, record } = setup();

    await controller.listCreators(q({ page: 2 }), req());

    expect(record).not.toHaveBeenCalled();
  });
});
