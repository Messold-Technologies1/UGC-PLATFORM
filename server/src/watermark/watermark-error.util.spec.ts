import { describePreviewError } from './watermark.service';

describe('describePreviewError', () => {
  it('keeps an Error message as-is', () => {
    expect(describePreviewError(new Error('ffmpeg exited with code 1'))).toBe(
      'ffmpeg exited with code 1',
    );
  });

  it('keeps the head of a long ffmpeg tail, where the diagnosis is', () => {
    // ffmpeg leads with the error and then dumps up to 4 KB of stderr, so the
    // useful part must survive truncation.
    const message = `ffmpeg exited with code 1: [libx264 @ 0x5] width not divisible by 2 (1079x1920) ${'noise '.repeat(500)}`;
    const out = describePreviewError(new Error(message));

    expect(out).toContain('width not divisible by 2 (1079x1920)');
    expect(out.length).toBeLessThanOrEqual(1001); // 1000 chars + the ellipsis
    expect(out.endsWith('…')).toBe(true);
  });

  it('leaves a message that fits unmarked', () => {
    expect(describePreviewError(new Error('short'))).toBe('short');
  });

  it('accepts a bare string', () => {
    expect(describePreviewError('spawn ffmpeg ENOENT')).toBe(
      'spawn ffmpeg ENOENT',
    );
  });

  it('never stores an empty or missing reason', () => {
    // An empty column has to mean "no failure recorded", so a failure that
    // carries no message must still say something.
    expect(describePreviewError(new Error(''))).toBe('Unknown error');
    expect(describePreviewError('   ')).toBe('Unknown error');
    expect(describePreviewError(undefined)).toBe('Unknown error');
    expect(describePreviewError(null)).toBe('null');
  });

  it('serialises a non-Error throw rather than losing it', () => {
    expect(describePreviewError({ code: 'EPIPE' })).toBe('{"code":"EPIPE"}');
  });
});
