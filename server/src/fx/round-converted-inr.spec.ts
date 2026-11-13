import {
  PRICE_STEP_INR,
  roundConvertedInr,
} from './round-converted-inr';

describe('roundConvertedInr', () => {
  it('rounds onto the 500 price grid', () => {
    // $100 at ~93.5 is 9,345.79, which a brand sees as 9,500.
    expect(roundConvertedInr(9345.79)).toBe(9500);
    expect(roundConvertedInr(9249)).toBe(9000);
    expect(roundConvertedInr(9500)).toBe(9500);
  });

  it('lands on the same multiples a rupee price can take', () => {
    // The point of the grid: a brand cannot tell which creators typed rupees.
    for (const inr of [1234, 5678, 9345.79, 42_000.5]) {
      expect(roundConvertedInr(inr) % 500).toBe(0);
    }
  });

  it('never rounds a real price down to nothing', () => {
    // A tiny foreign amount must not become a free package.
    expect(roundConvertedInr(1)).toBe(PRICE_STEP_INR);
    expect(roundConvertedInr(49)).toBe(PRICE_STEP_INR);
  });

  it('refuses nonsense rather than producing a negative price', () => {
    expect(roundConvertedInr(0)).toBe(0);
    expect(roundConvertedInr(-100)).toBe(0);
    expect(roundConvertedInr(Number.NaN)).toBe(0);
  });

  it('can move a whole step on a sub-percent rate move', () => {
    // Documenting the known cost of a grid this coarse rather than hiding
    // it: near a boundary, a half-percent move shifts the shown price by 500.
    // Accepted so that converted prices sit on the same grid as rupee ones.
    const base = 9249;
    const moved = base * 1.005; // ~9295, a half-percent move

    expect(roundConvertedInr(base)).toBe(9000);
    expect(roundConvertedInr(moved)).toBe(9500);
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
