import type {
  BriefContentType,
  BriefDurationBucket,
  BriefShootLocationKind,
  BriefToneStyle,
} from "../api/types";

export function formatGenericEnum(value: string | null | undefined): string {
  if (!value) return "N/A";
  return value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatDuration(
  bucket: BriefDurationBucket | string | null | undefined
): string {
  if (!bucket) return "N/A";
  const normalized = String(bucket).toUpperCase();
  switch (normalized) {
    case "SEC_0_15":
      return "0-15 Secs";
    case "SEC_15_30":
      return "15-30 Secs";
    case "SEC_30_45":
      return "30-45 Secs";
    case "SEC_45_60":
      return "45-60 Secs";
    case "SEC_60_100":
      return "1-1.5 Mins";
    case "NOT_SURE":
      return "Not Sure";
    default:
      return formatGenericEnum(bucket);
  }
}

export function formatLocation(
  kind: BriefShootLocationKind | string | null | undefined
): string {
  if (!kind) return "N/A";
  const normalized = String(kind).toUpperCase();
  switch (normalized) {
    case "CREATOR_OWN_SETUP":
      return "Creator's Own Setup";
    case "OUTDOOR_PUBLIC_LOCATION":
      return "Outdoor/Public Location";
    case "BRAND_SELECTED_LOCATION":
      return "Brand Selected Location";
    case "CREATOR_DECIDES":
      return "Creator Decides";
    default:
      return formatGenericEnum(kind);
  }
}

export function formatTone(
  tone: BriefToneStyle | string | null | undefined
): string {
  if (!tone) return "N/A";
  const normalized = String(tone).toUpperCase();
  switch (normalized) {
    case "FUNNY":
      return "Funny/Humorous";
    case "EMOTIONAL":
      return "Emotional";
    case "PREMIUM":
      return "Premium/Sleek";
    case "CASUAL":
      return "Casual/Authentic";
    case "TRENDY":
      return "Trendy/TikTok";
    case "CREATOR_DECIDES":
      return "Creator Decides";
    default:
      return formatGenericEnum(tone);
  }
}

export function formatContentType(
  type: BriefContentType | string | null | undefined
): string {
  if (!type) return "N/A";
  const normalized = String(type).toUpperCase();
  switch (normalized) {
    case "TALKING_VIDEO":
      return "Talking Head";
    case "PRODUCT_DEMO":
      return "Product Demo";
    case "TESTIMONIAL":
      return "Testimonial";
    case "AESTHETIC_REEL":
      return "Aesthetic Reel";
    case "UGC_AD":
      return "UGC Ad";
    case "CREATOR_DECIDES":
      return "Creator Decides";
    default:
      return formatGenericEnum(type);
  }
}
