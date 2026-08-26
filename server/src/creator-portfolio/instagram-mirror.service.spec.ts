import {
  MirrorRejectedError,
  assertMetaCdnUrl,
} from './instagram-mirror.service';

describe('assertMetaCdnUrl', () => {
  it('accepts Instagram and Facebook CDN hosts', () => {
    expect(
      assertMetaCdnUrl('https://scontent-lhr8-1.cdninstagram.com/v/t50/x.mp4')
        .hostname,
    ).toBe('scontent-lhr8-1.cdninstagram.com');
    expect(
      assertMetaCdnUrl('https://video-lhr6-2.xx.fbcdn.net/v/t42/y.mp4')
        .hostname,
    ).toBe('video-lhr6-2.xx.fbcdn.net');
  });

  it('refuses a URL with no value at all', () => {
    expect(() => assertMetaCdnUrl(null)).toThrow(MirrorRejectedError);
    expect(() => assertMetaCdnUrl('')).toThrow(MirrorRejectedError);
  });

  it('refuses plain http, so the fetch cannot be downgraded', () => {
    expect(() =>
      assertMetaCdnUrl('http://scontent.cdninstagram.com/x.mp4'),
    ).toThrow(/non-https/);
  });

  it('refuses an internal address', () => {
    for (const url of [
      'https://localhost/x.mp4',
      'https://127.0.0.1/x.mp4',
      'https://169.254.169.254/latest/meta-data/',
      'https://10.0.0.5/x.mp4',
    ]) {
      expect(() => assertMetaCdnUrl(url)).toThrow(/unexpected host/);
    }
  });

  it('is not fooled by a lookalike host that merely contains the suffix', () => {
    // The check is a suffix match on the hostname, so an attacker-controlled
    // domain that only embeds the string must still be refused.
    expect(() =>
      assertMetaCdnUrl('https://cdninstagram.com.evil.example/x.mp4'),
    ).toThrow(/unexpected host/);
    expect(() => assertMetaCdnUrl('https://notcdninstagram.com/x.mp4')).toThrow(
      /unexpected host/,
    );
  });

  it('refuses a non-URL string', () => {
    expect(() => assertMetaCdnUrl('not a url')).toThrow(/not a valid URL/);
  });
});
