const HEIC_EXTENSION = /\.(heic|heif)$/i;

/**
 * Apple devices shoot HEIC/HEIF by default. Browsers can't render it in an
 * <img>, and the API rejects it — so we convert to a web-friendly format in the
 * browser before uploading. Detection uses the MIME type when present and falls
 * back to the file extension (iOS/Safari sometimes report an empty type).
 */
export function isHeicImage(file: File): boolean {
  const type = file.type?.toLowerCase() ?? "";
  if (type === "image/heic" || type === "image/heif") return true;
  if (!type && HEIC_EXTENSION.test(file.name)) return true;
  return false;
}

export type HeicConvertTarget = "image/jpeg" | "image/png";

/**
 * Convert a HEIC/HEIF file to JPEG (default) or PNG. No-op for non-HEIC files,
 * so it's safe to call on every selected image. JPEG is the default because a
 * PNG re-encode of a photo is typically several times larger and can blow past
 * the image size cap.
 */
export async function convertHeicIfNeeded(
  file: File,
  target: HeicConvertTarget = "image/jpeg",
  quality = 0.9,
): Promise<File> {
  if (!isHeicImage(file)) return file;

  // Dynamically imported so the (browser-only) decoder is never bundled into
  // SSR and only loads when a creator actually picks a HEIC file.
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: target, quality });
  const blob = Array.isArray(converted) ? converted[0] : converted;

  const ext = target === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, { type: target });
}
