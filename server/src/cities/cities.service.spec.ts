import { CitiesService } from './cities.service';

type FindFirst = jest.Mock;

function makePrisma() {
  const state = { findFirst: jest.fn() as FindFirst };
  const city = { findFirst: jest.fn() as FindFirst };
  return { state, city } as any;
}

describe('CitiesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: CitiesService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CitiesService(prisma);
  });

  describe('resolveStateToCanonical', () => {
    it('returns null for blank input without querying', async () => {
      expect(await service.resolveStateToCanonical('   ')).toBeNull();
      expect(prisma.state.findFirst).not.toHaveBeenCalled();
    });

    it('matches an exact (case-insensitive) state name', async () => {
      prisma.state.findFirst.mockResolvedValueOnce({ name: 'Odisha' });
      expect(await service.resolveStateToCanonical('odisha')).toBe('Odisha');
    });

    it('falls back to an alias lookup (Orissa -> Odisha)', async () => {
      prisma.state.findFirst
        .mockResolvedValueOnce(null) // exact miss
        .mockResolvedValueOnce({ name: 'Odisha' }); // alias hit
      expect(await service.resolveStateToCanonical('Orissa')).toBe('Odisha');
      const aliasCall = prisma.state.findFirst.mock.calls[1][0];
      expect(aliasCall.where.aliasesNormalized).toEqual({ has: 'orissa' });
    });

    it('returns null when neither exact nor alias matches', async () => {
      prisma.state.findFirst.mockResolvedValue(null);
      expect(await service.resolveStateToCanonical('Atlantis')).toBeNull();
    });
  });

  describe('resolveCityToCanonical', () => {
    it('resolves an alias to the canonical city (Bombay -> Mumbai)', async () => {
      prisma.city.findFirst
        .mockResolvedValueOnce(null) // exact miss
        .mockResolvedValueOnce({ name: 'Mumbai' }); // alias hit
      expect(await service.resolveCityToCanonical('bombay')).toBe('Mumbai');
    });

    it('scopes the lookup to the given state', async () => {
      prisma.city.findFirst.mockResolvedValueOnce({ name: 'Mumbai' });
      await service.resolveCityToCanonical('Mumbai', 'Maharashtra');
      const where = prisma.city.findFirst.mock.calls[0][0].where;
      expect(where.stateName).toBe('Maharashtra');
    });
  });

  describe('resolveLocation', () => {
    it('resolves state first, then scopes the city to it', async () => {
      prisma.state.findFirst.mockResolvedValueOnce({ name: 'Maharashtra' });
      prisma.city.findFirst.mockResolvedValueOnce({ name: 'Mumbai' });

      const result = await service.resolveLocation({
        city: 'Bombay',
        state: 'Maharashtra',
      });

      expect(result).toEqual({ city: 'Mumbai', state: 'Maharashtra' });
      const cityWhere = prisma.city.findFirst.mock.calls[0][0].where;
      expect(cityWhere.stateName).toBe('Maharashtra');
    });

    it('returns nulls when inputs are absent', async () => {
      expect(await service.resolveLocation({})).toEqual({
        city: null,
        state: null,
      });
      expect(prisma.state.findFirst).not.toHaveBeenCalled();
      expect(prisma.city.findFirst).not.toHaveBeenCalled();
    });
  });
});
