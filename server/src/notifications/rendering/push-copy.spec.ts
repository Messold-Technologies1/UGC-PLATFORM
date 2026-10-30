import {
  PUSH_BODY_MAX,
  pushCopyFrom,
  pushClickUrl,
  pushTitleFrom,
  stripGreeting,
  truncateForPush,
} from './push-copy';

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

describe('pushTitleFrom', () => {
  const PLATFORM = 'Go Collab';

  // 29 of the 40 subjects sign off this way. A lock screen already shows the
  // site, so the tail is waste in a line the OS truncates.
  it('drops the platform sign-off an email subject carries', () => {
    expect(pushTitleFrom('📩 New brief from Acme — Go Collab', PLATFORM)).toBe(
      '📩 New brief from Acme',
    );
    expect(
      pushTitleFrom(
        '🎬 The creator delivered content — review on Go Collab',
        PLATFORM,
      ),
    ).toBe('🎬 The creator delivered content');
  });

  // The reason this matches on the platform name instead of "strip after the
  // last dash": plenty of subjects use a dash to carry meaning.
  it('keeps a dash that is part of the message', () => {
    expect(pushTitleFrom('Dispute resolved — order rejected', PLATFORM)).toBe(
      'Dispute resolved — order rejected',
    );
  });

  it('leaves a subject with no sign-off alone', () => {
    expect(pushTitleFrom('Your payout is on its way', PLATFORM)).toBe(
      'Your payout is on its way',
    );
  });

  it('never trims a title away to nothing', () => {
    expect(pushTitleFrom('Go Collab', PLATFORM)).toBe('Go Collab');
  });

  it('does nothing without a platform name to match', () => {
    expect(pushTitleFrom('📩 New brief — Go Collab', undefined)).toBe(
      '📩 New brief — Go Collab',
    );
  });
});

describe('stripGreeting', () => {
  // All 40 text templates open this way, and a notification has ~120
  // characters before it is cut off.
  it('drops the greeting an email opens with', () => {
    expect(stripGreeting('Hi Ananya,\n\nYour content was accepted.')).toBe(
      'Your content was accepted.',
    );
    expect(stripGreeting('Hello Rohit,\nThe creator accepted.')).toBe(
      'The creator accepted.',
    );
  });

  it('keeps an opening line that carries content', () => {
    const text = 'Your order was cancelled.\n\nA refund is on its way.';

    expect(stripGreeting(text)).toBe(text);
  });

  it('keeps a greeting that is the whole message', () => {
    expect(stripGreeting('Hi Ananya,')).toBe('Hi Ananya,');
  });
});

describe('pushCopyFrom', () => {
  const email = {
    renderedSubject: '📩 New brief from Acme — Go Collab',
    renderedText: 'Hi Ananya,\n\nAcme submitted a brief for your package.',
    platformName: 'Go Collab',
  };

  it('derives both halves from the email when nothing is overridden', () => {
    expect(pushCopyFrom(email)).toEqual({
      title: '📩 New brief from Acme',
      body: 'Acme submitted a brief for your package.',
    });
  });

  // Copy written for a lock screen has no email conventions to repair, so the
  // trims that fix the fallback must not touch it.
  it('uses an override as written, without stripping or trimming', () => {
    const out = pushCopyFrom({
      ...email,
      overrideTitle: 'Hi there — a brief from Acme',
      overrideBody: 'Hello! Tap to review it.',
    });

    expect(out.title).toBe('Hi there — a brief from Acme');
    expect(out.body).toBe('Hello! Tap to review it.');
  });

  it('overrides each half independently', () => {
    expect(pushCopyFrom({ ...email, overrideTitle: 'New brief' })).toEqual({
      title: 'New brief',
      body: 'Acme submitted a brief for your package.',
    });
    expect(pushCopyFrom({ ...email, overrideBody: 'Tap to review' })).toEqual({
      title: '📩 New brief from Acme',
      body: 'Tap to review',
    });
  });

  // A cleared editor field means "go back to deriving it", not "send blank".
  it('treats an empty or whitespace override as absent', () => {
    expect(
      pushCopyFrom({ ...email, overrideTitle: '   ', overrideBody: '' }),
    ).toEqual({
      title: '📩 New brief from Acme',
      body: 'Acme submitted a brief for your package.',
    });
  });

  it('still truncates an override, because the platform does anyway', () => {
    const out = pushCopyFrom({ ...email, overrideBody: 'x'.repeat(400) });

    expect(out.body.length).toBeLessThanOrEqual(PUSH_BODY_MAX + 1);
  });
});
