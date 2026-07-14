import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const POSTER_GRADIENTS: readonly [string, string][] = [
  ["#f97394", "#7c3aed"],
  ["#22d3ee", "#3b82f6"],
  ["#fb923c", "#db2777"],
  ["#34d399", "#0ea5e9"],
  ["#a78bfa", "#ec4899"],
  ["#f43f5e", "#f59e0b"],
  ["#60a5fa", "#a855f7"],
  ["#2dd4bf", "#6366f1"],
  ["#fbbf24", "#ef4444"],
  ["#c084fc", "#3b82f6"],
  ["#4ade80", "#14b8a6"],
  ["#fb7185", "#8b5cf6"],
];

export function posterColor(index: number): [string, string] {
  const pair = POSTER_GRADIENTS[index % POSTER_GRADIENTS.length]!;
  return [pair[0], pair[1]];
}

const TAG_COLORS: Record<string, [bg: string, fg: string]> = {
  Beauty: ["#fce7f3", "#be185d"],
  Skincare: ["#dcfce7", "#15803d"],
  Fashion: ["#ede9fe", "#5b21b6"],
  Fitness: ["#ffedd5", "#c2410c"],
  "Food & Bev": ["#fef9c3", "#a16207"],
  "Tech & Gadgets": ["#e0f2fe", "#0369a1"],
  "Home & Decor": ["#ccfbf1", "#0f766e"],
  Parenting: ["#fae8ff", "#a21caf"],
  Travel: ["#cffafe", "#0e7490"],
  Wellness: ["#dcfce7", "#15803d"],
  Gaming: ["#f3e8ff", "#7e22ce"],
  Finance: ["#e2e8f0", "#334155"],
  Aesthetic: ["#ccfbf1", "#0f766e"],
  Casual: ["#e0f2fe", "#0369a1"],
  Cinematic: ["#e2e8f0", "#334155"],
  "High-energy": ["#ffedd5", "#c2410c"],
  Minimal: ["#f1f5f9", "#475569"],
  Storytelling: ["#fae8ff", "#a21caf"],
  "Talking Head": ["#e0f2fe", "#0369a1"],
  Unboxing: ["#ede9fe", "#5b21b6"],
  "Product Demo": ["#ede9fe", "#5b21b6"],
  Tutorial: ["#dbeafe", "#1d4ed8"],
  Vlog: ["#ffe4e6", "#be123c"],
  Testimonial: ["#dcfce7", "#15803d"],
  GRWM: ["#fce7f3", "#be185d"],
  "Street Interview": ["#fef9c3", "#a16207"],
};

const DEFAULT_TAG_COLOR: [string, string] = ["#f1f5f9", "#475569"];

export function tagColor(tag: string): [string, string] {
  return TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR;
}

export function formatReelDuration(index: number): string {
  const seconds = 18 + ((index * 7) % 40);
  return `0:${seconds.toString().padStart(2, "0")}`;
}

const POSTER_IMAGE_WIDTH = 384;
const POSTER_IMAGE_QUALITY = 75;

/**
 * Runs an image URL through Next.js's built-in image optimizer (resize +
 * format negotiation), for places that need a plain string URL rather than
 * a <Image> element — e.g. the `poster` attribute on a native <video>,
 * which can't render a React component. Falls back to the original URL if
 * given nothing, so callers don't need their own guard.
 *
 * `w` must be one of the widths Next actually serves (its default
 * imageSizes/deviceSizes list); 384 is the largest configured `imageSizes`
 * bucket and comfortably covers this app's card widths.
 */
export function buildOptimizedPosterUrl(
  url: string | undefined | null,
): string | undefined {
  if (!url) return undefined;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${POSTER_IMAGE_WIDTH}&q=${POSTER_IMAGE_QUALITY}`;
}
