import {
  buildAdminOrdersSearchWhere,
  orderIdPrefixRange,
} from './admin-orders-search.util';

/**
 * The order id is a Postgres `uuid`, so the search cannot reach it with the
 * `contains` filter every other field uses — it goes through a range instead.
 * These are the cases an admin actually types: the short id the UI prints, a
 * whole id pasted from an order URL, and a name that happens to look hexish.
 */
describe('orderIdPrefixRange', () => {
  it('turns the 8-character short id into the range it covers', () => {
    // "Order #AB12CD34" as the UI renders it.
    expect(orderIdPrefixRange('AB12CD34')).toEqual({
      gte: 'ab12cd34-0000-0000-0000-000000000000',
      lte: 'ab12cd34-ffff-ffff-ffff-ffffffffffff',
    });
  });

  it('pins a whole uuid to itself, dashes or not', () => {
    const id = '7f3b2c91-4d5e-4a0b-8c1d-2e3f4a5b6c7d';
    expect(orderIdPrefixRange(id)).toEqual({ gte: id, lte: id });
    expect(orderIdPrefixRange(id.replace(/-/g, ''))).toEqual({
      gte: id,
      lte: id,
    });
  });

  it('ignores terms that cannot be part of a uuid', () => {
    expect(orderIdPrefixRange('acme')).toBeNull(); // 'm' is not hex
    expect(orderIdPrefixRange('Nike')).toBeNull();
    expect(orderIdPrefixRange('ab')).toBeNull(); // too short to narrow anything
    expect(orderIdPrefixRange('a'.repeat(33))).toBeNull();
  });
});

describe('buildAdminOrdersSearchWhere', () => {
  it('is undefined for an empty term, so callers can spread it blindly', () => {
    expect(buildAdminOrdersSearchWhere(undefined)).toBeUndefined();
    expect(buildAdminOrdersSearchWhere('   ')).toBeUndefined();
  });

  it('searches every party the admin list prints, case-insensitively', () => {
    const where = buildAdminOrdersSearchWhere('Acme');
    const like = { contains: 'Acme', mode: 'insensitive' };

    expect(where?.OR).toEqual([
      { creator: { displayName: like } },
      { brand: { brandName: like } },
      { agency: { name: like } },
      { placedByAgency: { name: like } },
      { briefRef: { brandName: like } },
    ]);
  });

  it('adds the id range only when the term could be one', () => {
    const byName = buildAdminOrdersSearchWhere('Acme');
    expect(byName?.OR).toHaveLength(5);

    const byId = buildAdminOrdersSearchWhere('ab12cd34');
    expect(byId?.OR).toHaveLength(6);
    expect(byId?.OR).toContainEqual({
      id: {
        gte: 'ab12cd34-0000-0000-0000-000000000000',
        lte: 'ab12cd34-ffff-ffff-ffff-ffffffffffff',
      },
    });
    // A hex-looking word still searches the names too — nothing is traded away.
    expect(buildAdminOrdersSearchWhere('cafe')?.OR).toContainEqual({
      brand: { brandName: { contains: 'cafe', mode: 'insensitive' } },
    });
  });
});
