import { PUSH_BODY_MAX, pushClickUrl, truncateForPush } from './push-copy';

describe('truncateForPush', () => {
  it('leaves short copy alone', () => {
    expect(truncateForPush('Brief accepted')).toBe('Brief accepted');
  });

  it('collapses the whitespace a rendered email leaves behind', () => {
    expect(truncateForPush('Brief\n\n  accepted\t')).toBe('Brief accepted');
  });

  it('breaks at a word rather than mid-word', () => {
    const result = truncateForPush('a'.repeat(50) + ' ' + 'b'.repeat(50), 60);

    expect(result).toBe('a'.repeat(50) + '…');
  });

  // Half a URL still says more than an ellipsis on its own.
  it('cuts hard when the word break would throw most of the budget away', () => {
    const result = truncateForPush('hi ' + 'x'.repeat(200), 60);

    expect(result).toHaveLength(61);
    expect(result.endsWith('…')).toBe(true);
  });

  it('keeps the result within the budget', () => {
    const result = truncateForPush('word '.repeat(200));

    expect(result.length).toBeLessThanOrEqual(PUSH_BODY_MAX + 1);
  });
});

describe('pushClickUrl', () => {
  const base = 'https://app.example.com';

  it('passes an absolute action URL through', () => {
    expect(pushClickUrl(`${base}/creator/orders/1`, base)).toBe(
      `${base}/creator/orders/1`,
    );
  });

  // A service worker given a relative URL opens the push service's origin,
  // so the click would land somewhere that is not this app at all.
  it('absolutises a relative action URL', () => {
    expect(pushClickUrl('/creator/orders/1', base)).toBe(
      `${base}/creator/orders/1`,
    );
    expect(pushClickUrl('creator/orders/1', base)).toBe(
      `${base}/creator/orders/1`,
    );
  });

  it('falls back to the app root when the event has no action', () => {
    expect(pushClickUrl(null, base)).toBe(base);
    expect(pushClickUrl('   ', base)).toBe(base);
    expect(pushClickUrl(undefined, `${base}/`)).toBe(base);
  });
});
