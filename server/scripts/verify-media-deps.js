#!/usr/bin/env node
/**
 * Proves the two host dependencies the media pipeline needs are actually
 * working, before the app starts serving. Run it from deploy.sh.
 *
 * Both of these fail SILENTLY in production, which is the only reason this
 * file exists:
 *
 *   Fonts   The watermark is SVG text rendered by sharp/librsvg with
 *           font-family "DejaVu Sans". With no font installed, librsvg does
 *           not error — it renders blank or near-blank glyphs, and the
 *           watermark ships barely visible. A bare image measured ~23% of the
 *           intended ink coverage.
 *
 *   ffmpeg  ffmpeg-static is NOT pinned by the lockfile: the package declares
 *           release tag b6.1.1 but the asset behind it now ships 7.0.2, so two
 *           installs of the same commit can get different binaries. One that
 *           cannot run the watermark filter graph does not fail — it writes an
 *           AUDIO-ONLY file and exits 0. That is how a watermarked preview
 *           with no video stream reached production.
 *
 * Exits non-zero with a diagnosis on failure. Takes about a second.
 */
'use strict';

const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const sharp = require('sharp');
const ffmpegStatic = require('ffmpeg-static');

const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';

// Measured, not guessed: a correct render of this tile scores a mean alpha of
// 4.0 (the pattern is mostly empty space — one line of text per 288x192 tile —
// so the absolute number is low by design). The Dockerfile records a bare host
// at ~23% of intended ink coverage, i.e. ~0.9 here. 2.0 sits clearly between
// the two.
//
// What this detects: no usable font on the host at all, which is the state a
// fresh Amazon Linux box is in and the one that ships a near-invisible
// watermark. What it does NOT detect: fontconfig substituting some other font
// for DejaVu — a substitute renders just as much ink. That case is what the
// fc-match check above is for.
// Overridable so you can sanity-check the check itself on a new host:
// VERIFY_MIN_MEAN_ALPHA=99 should FAIL, proving the assertion is live and not
// silently passing everything.
const MIN_MEAN_ALPHA = Number(process.env.VERIFY_MIN_MEAN_ALPHA) || 2.0;

let failures = 0;

function pass(label, detail) {
  console.log(`  ok    ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail) {
  failures++;
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
}

function run(args, cwd) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, args, {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr = (stderr + d.toString()).slice(-4000);
    });
    proc.on('error', (err) => resolve({ code: null, stderr: String(err) }));
    proc.on('close', (code) => resolve({ code, stderr }));
  });
}

/**
 * The same SVG shape WatermarkService builds, so this tests the real thing
 * rather than an approximation of it.
 */
function watermarkSvg(width, height, text) {
  const fontSize = Math.max(20, Math.round(Math.min(width, height) / 16));
  const tileW = fontSize * 9;
  const tileH = fontSize * 6;
  const safe = String(text).replace(/[&<>]/g, '');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <pattern id="wm" width="${tileW}" height="${tileH}" patternTransform="rotate(-30)" patternUnits="userSpaceOnUse">
          <text x="0" y="${Math.round(tileH / 2)}" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="${fontSize}" fill="rgba(255,255,255,0.45)" stroke="rgba(0,0,0,0.28)" stroke-width="1.5">${safe}</text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wm)"/>
    </svg>`,
  );
}

async function checkFonts() {
  console.log('\nfonts');

  // Direct check where fontconfig exists: does "DejaVu Sans" resolve to an
  // actual DejaVu file, or is fontconfig quietly substituting something else?
  const match = spawnSync('fc-match', ['DejaVu Sans'], { encoding: 'utf8' });
  if (match.error) {
    console.log('  skip  fc-match not installed (not a Linux host?)');
  } else {
    const out = (match.stdout || '').trim();
    if (/dejavu/i.test(out)) {
      pass('fc-match "DejaVu Sans"', out);
    } else {
      fail(
        'fc-match "DejaVu Sans"',
        `resolved to "${out}" — install dejavu-sans-fonts`,
      );
    }
  }

  // The check that actually matters: render the real watermark and see
  // whether any ink landed. This catches a missing font whether or not
  // fontconfig is present to ask.
  const text = process.env.WATERMARK_TEXT || 'gocollab';
  try {
    const svg = watermarkSvg(512, 512, text);
    const { data, info } = await sharp(svg)
      .png()
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    let alphaSum = 0;
    const px = info.width * info.height;
    for (let i = 3; i < data.length; i += info.channels) alphaSum += data[i];
    const meanAlpha = alphaSum / px;

    if (meanAlpha >= MIN_MEAN_ALPHA) {
      pass(
        `watermark renders ink (text "${text}")`,
        `mean alpha ${meanAlpha.toFixed(1)} >= ${MIN_MEAN_ALPHA}`,
      );
    } else {
      fail(
        `watermark renders ink (text "${text}")`,
        `mean alpha ${meanAlpha.toFixed(1)} < ${MIN_MEAN_ALPHA} — the glyphs are blank, ` +
          'so no usable font is installed. Run: sudo dnf install -y dejavu-sans-fonts fontconfig',
      );
    }
  } catch (err) {
    fail('watermark SVG render', String(err && err.message));
  }
}

async function checkFfmpeg() {
  console.log('\nffmpeg');
  console.log(`  path  ${ffmpegPath}`);

  const ver = spawnSync(ffmpegPath, ['-version'], { encoding: 'utf8' });
  if (ver.error || ver.status !== 0) {
    fail('ffmpeg is executable', String((ver.error && ver.error.message) || ver.status));
    return;
  }
  pass('ffmpeg is executable', (ver.stdout || '').split('\n')[0]);

  const dir = mkdtempSync(join(tmpdir(), 'verify-media-'));
  try {
    // Lifted from the Dockerfile. The clip is deliberately ODD-sized: libx264
    // cannot encode odd dimensions under yuv420p, so this doubles as proof
    // that the crop in the filter graph is doing its job. Drop the crop and
    // this fails with "width not divisible by 2" — which is exactly how a
    // creator's delivery once died in production.
    let r = await run([
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc2=s=66x64:r=10:d=1',
      '-f', 'lavfi', '-i', 'sine=d=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest',
      join(dir, 'src.mp4'),
    ]);
    if (r.code !== 0) {
      fail('encode a test clip (libx264 + aac)', r.stderr.slice(-400));
      return;
    }
    pass('encode a test clip (libx264 + aac)');

    r = await run([
      '-v', 'error', '-y', '-i', join(dir, 'src.mp4'),
      '-vf', 'crop=65:63',
      '-c:v', 'libx264', '-pix_fmt', 'yuv444p', '-c:a', 'copy',
      join(dir, 'odd.mp4'),
    ]);
    if (r.code !== 0) {
      fail('produce an odd-dimensioned source', r.stderr.slice(-400));
      return;
    }

    writeFileSync(
      join(dir, 'mark.png'),
      await sharp({
        create: {
          width: 64, height: 64, channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0.3 },
        },
      }).png().toBuffer(),
    );

    // The real filter graph from WatermarkService — scale2ref + overlay with
    // a `-loop 1` still image. This is the part a drifted binary cannot do.
    r = await run([
      '-v', 'error', '-y',
      '-i', join(dir, 'odd.mp4'),
      '-loop', '1', '-i', join(dir, 'mark.png'),
      '-filter_complex',
      '[0:v]crop=trunc(iw/2)*2:trunc(ih/2)*2[basesrc];' +
        '[1:v][basesrc]scale2ref[wm][base];' +
        '[base][wm]overlay=0:0:format=auto:shortest=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-shortest',
      join(dir, 'out.mp4'),
    ]);
    if (r.code !== 0) {
      fail('run the watermark filter graph', r.stderr.slice(-400));
      return;
    }
    pass('run the watermark filter graph (scale2ref + overlay)');

    // The one that catches the silent failure: exit 0 is not enough, the
    // output has to actually CONTAIN a video stream.
    r = await run(['-v', 'error', '-i', join(dir, 'out.mp4'), '-map', '0:v:0', '-f', 'null', '-']);
    if (r.code !== 0) {
      fail(
        'output contains a decodable video stream',
        'ffmpeg exited 0 but wrote no video — this binary would ship audio-only previews',
      );
      return;
    }
    pass('output contains a decodable video stream');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  console.log('Verifying media dependencies...');
  await checkFonts();
  await checkFfmpeg();

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed — not safe to deploy.\n`);
    process.exit(1);
  }
  console.log('\nAll media dependencies OK.\n');
})().catch((err) => {
  console.error('verify-media-deps crashed:', err);
  process.exit(1);
});
