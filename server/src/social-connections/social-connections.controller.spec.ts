import { sanitizeReturnPath } from './social-connections.controller';

describe('sanitizeReturnPath', () => {
  it('accepts a root-relative path on our own site', () => {
    expect(sanitizeReturnPath('/creator/portfolio')).toBe('/creator/portfolio');
    expect(sanitizeReturnPath('/creator/profile?step=portfolio')).toBe(
      '/creator/profile?step=portfolio',
    );
  });

  it('falls back when nothing was requested', () => {
    expect(sanitizeReturnPath(undefined)).toBeNull();
    expect(sanitizeReturnPath('')).toBeNull();
    expect(sanitizeReturnPath('   ')).toBeNull();
  });

  it('refuses an absolute URL, so the callback cannot be an open redirect', () => {
    expect(sanitizeReturnPath('https://evil.example/steal')).toBeNull();
    expect(sanitizeReturnPath('http://evil.example')).toBeNull();
  });

  it('refuses a protocol-relative host', () => {
    expect(sanitizeReturnPath('//evil.example/steal')).toBeNull();
  });

  it('refuses a backslash, which some browsers normalise to a slash', () => {
    expect(sanitizeReturnPath('/\\\\evil.example')).toBeNull();
  });

  it('refuses a scheme smuggled behind leading slashes', () => {
    expect(sanitizeReturnPath('/javascript:alert(1)')).toBeNull();
    expect(sanitizeReturnPath('//\tjavascript:alert(1)')).toBeNull();
  });

  it('refuses a bare relative path that could resolve off-route', () => {
    expect(sanitizeReturnPath('creator/portfolio')).toBeNull();
  });
});
