/** Public sample MP4s used by AI-search seed + S3 backfill (reachable without auth). */
export const SAMPLE_VIDEOS = [
  'https://download.samplelib.com/mp4/sample-5s.mp4',
  'https://download.samplelib.com/mp4/sample-10s.mp4',
  'https://download.samplelib.com/mp4/sample-15s.mp4',
  'https://download.samplelib.com/mp4/sample-20s.mp4',
  'https://filesamples.com/samples/video/mp4/sample_640x360.mp4',
  'https://filesamples.com/samples/video/mp4/sample_960x540.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://download.samplelib.com/mp4/sample-30s.mp4',
] as const;

const LEGACY_GOOGLE_SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
] as const;

function stableSampleIndex(url: string): number {
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash + url.charCodeAt(i)) % SAMPLE_VIDEOS.length;
  }
  return hash;
}

/** Map blocked Google sample URLs (and other legacy seeds) to working downloads. */
export function resolveSampleVideoDownloadUrl(url: string): string {
  const legacyIndex = LEGACY_GOOGLE_SAMPLE_VIDEOS.indexOf(
    url as (typeof LEGACY_GOOGLE_SAMPLE_VIDEOS)[number],
  );
  if (legacyIndex >= 0) {
    return SAMPLE_VIDEOS[legacyIndex % SAMPLE_VIDEOS.length]!;
  }
  if (
    url.includes('gtv-videos-bucket') ||
    url.includes('commondatastorage.googleapis.com/gtv-videos')
  ) {
    return SAMPLE_VIDEOS[stableSampleIndex(url)]!;
  }
  return url;
}
