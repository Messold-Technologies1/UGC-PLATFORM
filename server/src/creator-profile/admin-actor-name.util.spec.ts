import { adminActorDisplayName } from './admin-actor-name.util';

describe('adminActorDisplayName', () => {
  it('prefers a trimmed name', () => {
    expect(
      adminActorDisplayName({ name: '  Bipasha Roy  ', email: 'b@messold.com' }),
    ).toBe('Bipasha Roy');
  });

  it('falls back to email when name is blank', () => {
    expect(adminActorDisplayName({ name: '  ', email: 'admin@gocollab.io' })).toBe(
      'admin@gocollab.io',
    );
  });

  it('returns null when neither is present', () => {
    expect(adminActorDisplayName(null)).toBeNull();
    expect(adminActorDisplayName({})).toBeNull();
  });
});
