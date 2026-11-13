import {
  CONVERTED_PRICE_ROUNDING,
  roundConvertedInr,
} from './round-converted-inr';

describe('roundConvertedInr', () => {
  it('rounds to the nearest 100', () => {
    expect(roundConvertedInr(9345.79)).toBe(9300);
    expect(roundConvertedInr(9355.0)).toBe(9400);
    expect(roundConvertedInr(9300)).toBe(9300);
  });

  it('never rounds a real price down to nothing', () => {
    // A tiny foreign amount must not become a free package.
    expect(roundConvertedInr(1)).toBe(CONVERTED_PRICE_ROUNDING);
    expect(roundConvertedInr(49)).toBe(CONVERTED_PRICE_ROUNDING);
  });

  it('refuses nonsense rather than producing a negative price', () => {
    expect(roundConvertedInr(0)).toBe(0);
    expect(roundConvertedInr(-100)).toBe(0);
    expect(roundConvertedInr(Number.NaN)).toBe(0);
  });

  it('damps a small rate move instead of amplifying it', () => {
    // The reason this is not the ?500 price step: a ~0.5% move should not
    // visibly jump the shop window.
    // A price sitting near a ?500 boundary is where the difference shows.
    const base = 9249;
    const moved = base * 1.005; // ~9295, a half-percent move

    expect(Math.abs(roundConvertedInr(moved) - roundConvertedInr(base))).toBe(
      100,
    );

    const stepped = (n: number) => Math.round(n / 500) * 500;
    expect(Math.abs(stepped(moved) - stepped(base))).toBe(500);
  });

  it('is stable: saving then refreshing at the same rate changes nothing', () => {
    // The save path and the nightly refresh both round through here, so a
    // package must not shift the first time the refresh touches it.
    const onSave = roundConvertedInr(9345.79);
    const onRefresh = roundConvertedInr(9345.79);
    expect(onRefresh).toBe(onSave);
    // And rounding an already-rounded figure is a no-op.
    expect(roundConvertedInr(onSave)).toBe(onSave);
  });
});
