/**
 * Guard against an ffmpeg run that "succeeds" without encoding any video.
 *
 * ffmpeg exits 0 when a filter graph ends early — it muxed a valid file, just
 * one with no video in it. That is how an audio-only "watermarked" preview
 * reached production unnoticed: the encode reported success, the job completed
 * and the broken file was uploaded. Exit code alone is not proof of output, so
 * the caller checks the progress line too.
 */

/** Trailing `frame=   74` from ffmpeg's progress output; -1 when absent. */
export function parseEncodedFrameCount(stderr: string): number {
  const matches = [...stderr.matchAll(/frame=\s*(\d+)/g)];
  const last = matches.at(-1);
  return last ? Number(last[1]) : -1;
}

/**
 * Size of the video the muxer wrote, from the `video:581KiB audio:26KiB`
 * summary; -1 when absent. The unit is deliberately ignored — ffmpeg 6 prints
 * `kB`, ffmpeg 7 `KiB`, and a long encode prints `MiB` — because only "zero or
 * not" is ever read. The LAST match wins, since the summary is the final thing
 * the muxer prints.
 */
export function parseMuxedVideoSize(stderr: string): number {
  const matches = [
    ...stderr.matchAll(/video:\s*(\d+(?:\.\d+)?)\s*[kKmMgG]?i?B/g),
  ];
  const last = matches.at(-1);
  return last ? Number(last[1]) : -1;
}

/**
 * Throw when ffmpeg exited 0 but wrote no video. Missing markers are tolerated
 * (an ffmpeg build or locale that words its summary differently must not fail
 * an encode that genuinely worked) — only a marker that is present AND zero is
 * treated as failure.
 */
export function assertEncodedVideoFrames(stderr: string): void {
  const frames = parseEncodedFrameCount(stderr);
  const videoSize = parseMuxedVideoSize(stderr);
  if (frames === 0 || videoSize === 0) {
    throw new Error(
      `ffmpeg exited 0 but encoded no video (frames=${frames}, videoSize=${videoSize}). ` +
        'The output would have been an audio-only file. ffmpeg tail: ' +
        stderr.slice(-800),
    );
  }
}
