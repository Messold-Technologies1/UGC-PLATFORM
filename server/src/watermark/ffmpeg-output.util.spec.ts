import {
  assertEncodedVideoFrames,
  parseEncodedFrameCount,
  parseMuxedVideoSize,
} from './ffmpeg-output.util';

/**
 * The fixtures are REAL ffmpeg tails captured from the watermark command: the
 * broken single-frame-overlay run on ffmpeg 7 (zero frames, exit 0) and healthy
 * runs on ffmpeg 7 and 6. The bug they describe shipped an audio-only preview
 * to production, so the guard is checked against what ffmpeg actually prints
 * rather than against invented text.
 */

// ffmpeg 7.0.2, watermark overlay without `-loop 1`: exits 0, encodes nothing.
const BROKEN_FFMPEG_7 = `
[mp4 @ 0x1fc3a7c0] Starting second pass: moving the moov atom to the beginning of the file
[out#0/mp4 @ 0x1fc3c0c0] video:0KiB audio:26KiB subtitle:0KiB other streams:0KiB global headers:0KiB muxing overhead: 5.146332%
frame=    0 fps=0.0 q=0.0 Lsize=      27KiB time=N/A bitrate=N/A speed=N/A    
`;

// ffmpeg 7.0.2 with the fix.
const HEALTHY_FFMPEG_7 = `
[out#0/mp4 @ 0x45552a80] video:568KiB audio:26KiB subtitle:0KiB other streams:0KiB global headers:0KiB muxing overhead: 0.623484%
frame=   73 fps= 25 q=-1.0 Lsize=     611KiB time=00:00:02.96 bitrate=1690.2kbits/s speed=1.01x    
[libx264 @ 0x90ae680] kb/s:1591.67
`;

// ffmpeg 6.1.1 with the fix — note `kB`, not `KiB`.
const HEALTHY_FFMPEG_6 = `
[out#0/mp4 @ 0x564b0031ae80] video:581kB audio:26kB subtitle:0kB other streams:0kB global headers:0kB muxing overhead: 0.623644%
frame=   74 fps= 42 q=-1.0 Lsize=     612kB time=00:00:02.99 bitrate=1675.0kbits/s speed=1.67x    
[libx264 @ 0x55a7b5175780] kb/s:1270.31
`;

describe('parseEncodedFrameCount', () => {
  it('reads the final frame count, not an earlier progress line', () => {
    const progress =
      'frame=    2 fps=1.8\rframe=   47 fps=29\rframe=   75 fps=42';
    expect(parseEncodedFrameCount(progress)).toBe(75);
  });

  it('reads zero from the broken encode', () => {
    expect(parseEncodedFrameCount(BROKEN_FFMPEG_7)).toBe(0);
  });

  it('returns -1 when ffmpeg printed no progress line', () => {
    expect(parseEncodedFrameCount('some unrelated output')).toBe(-1);
  });
});

describe('parseMuxedVideoSize', () => {
  it('reads KiB (ffmpeg 7) and kB (ffmpeg 6) alike', () => {
    expect(parseMuxedVideoSize(HEALTHY_FFMPEG_7)).toBe(568);
    expect(parseMuxedVideoSize(HEALTHY_FFMPEG_6)).toBe(581);
  });

  it('reads MiB, as a long encode prints', () => {
    expect(parseMuxedVideoSize('video:487MiB audio:7MiB subtitle:0KiB')).toBe(
      487,
    );
  });

  it('reads the zero the broken encode reports', () => {
    expect(parseMuxedVideoSize(BROKEN_FFMPEG_7)).toBe(0);
  });

  it('returns -1 when the summary is absent', () => {
    expect(parseMuxedVideoSize('no summary here')).toBe(-1);
  });
});

describe('assertEncodedVideoFrames', () => {
  it('rejects the encode that exits 0 having written no video', () => {
    // Without this the audio-only file is uploaded as a "watermarked preview":
    // the brand hears the delivery but sees nothing.
    expect(() => assertEncodedVideoFrames(BROKEN_FFMPEG_7)).toThrow(
      /encoded no video/,
    );
  });

  it('accepts a healthy encode on either ffmpeg version', () => {
    expect(() => assertEncodedVideoFrames(HEALTHY_FFMPEG_7)).not.toThrow();
    expect(() => assertEncodedVideoFrames(HEALTHY_FFMPEG_6)).not.toThrow();
  });

  it('tolerates output with neither marker rather than failing a good encode', () => {
    // An ffmpeg build or locale that words its summary differently must not
    // fail an encode that actually worked.
    expect(() =>
      assertEncodedVideoFrames('unrecognised ffmpeg output'),
    ).not.toThrow();
  });

  it('names both signals in the error so the cause is diagnosable from logs', () => {
    expect(() => assertEncodedVideoFrames(BROKEN_FFMPEG_7)).toThrow(
      /frames=0, videoSize=0/,
    );
  });
});
