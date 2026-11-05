"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicProfileMedia } from "../types";

/** Niche pill tints, cycled so adjacent categories stay distinct. */
export const CATEGORY_TINTS = [
  "bg-gc-tint-rose text-gc-tint-rose-ink",
  "bg-gc-tint-mint text-gc-tint-mint-ink",
  "bg-gc-tint-violet text-gc-tint-violet-ink",
  "bg-gc-tint-sky text-gc-tint-sky-ink",
  "bg-gc-tint-amber text-gc-tint-amber-ink",
];

/** Approval tick shown beside the headline. */
export function VerifiedTick({ className }: { className?: string }) {
  return (
    <span
      title="Verified"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-gc-success text-white",
        className,
      )}
    >
      <Check className="size-3.5" strokeWidth={3} />
    </span>
  );
}

type PublicPageHeaderProps = {
  priceLabel: string;
  onBook: () => void;
  className?: string;
  innerClassName?: string;
};

/** Sticky brand bar with the booking shortcut. */
export function PublicPageHeader({
  priceLabel,
  onBook,
  className,
  innerClassName,
}: PublicPageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-gc-line bg-white/95 backdrop-blur",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5",
          innerClassName,
        )}
      >
        <Link href="/" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img
            src="/brand-logo.png"
            alt="GoCollab"
            className="h-8 w-auto object-contain object-left sm:h-9"
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </Link>
        <button
          type="button"
          onClick={onBook}
          className="h-10 whitespace-nowrap rounded-full bg-gc-ink px-4.5 text-sm font-semibold text-white transition hover:bg-gc-ink-soft"
        >
          Book · {priceLabel}
        </button>
      </div>
    </header>
  );
}


type HeroVisualProps = {
  /** The intro reel, or null when the creator has not uploaded one. */
  media: PublicProfileMedia | null;
  /** Shown in the same space when there is no intro reel. */
  fallbackImageUrl: string | null;
  /** Last resort when there is no intro reel and no profile picture. */
  fallbackInitials?: string;
  onOpen?: () => void;
  className?: string;
  imageClassName?: string;
  /** Scrims and other always-on decoration. */
  overlay?: ReactNode;
  /** The "Intro reel" pill — suppressed when there is no reel to play. */
  badge?: ReactNode;
  /** Caption such as "Watch intro" — also reel-only. */
  caption?: ReactNode;
  playClassName?: string;
  playIconClassName?: string;
};

/**
 * The large visual at the top of a public page.
 *
 * Shows the intro reel when the creator has one. When they don't, it falls back
 * to their profile picture and drops every affordance that implies playback —
 * badge, play button, caption, and the click target itself — so the space still
 * reads as a portrait instead of a broken or empty player. Templates pass their
 * own sizing, radius and decoration.
 */
export function HeroVisual({
  media,
  fallbackImageUrl,
  fallbackInitials,
  onOpen,
  className,
  imageClassName,
  overlay,
  badge,
  caption,
  playClassName,
  playIconClassName,
}: HeroVisualProps) {
  const isPlayable = Boolean(media && onOpen);
  const posterUrl = media?.thumbnailUrl ?? (media ? null : fallbackImageUrl);

  const visual = (
    <>
      {posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote S3 asset
        <img
          src={posterUrl}
          alt=""
          className={cn(
            "absolute inset-0 size-full object-cover",
            isPlayable &&
              "transition-transform duration-500 group-hover:scale-[1.03]",
            // Templates tune the crop for a 9:16 reel frame. A profile picture
            // is square, so centre it instead of inheriting that offset.
            media ? imageClassName : "object-center",
          )}
          loading="eager"
          decoding="async"
        />
      ) : media ? (
        <video
          src={media.videoUrl}
          className={cn("absolute inset-0 size-full object-cover", imageClassName)}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-gc-surface text-3xl font-bold text-gc-muted">
          {fallbackInitials}
        </span>
      )}

      {overlay}

      {media && (
        <>
          {badge}
          <span
            className={cn(
              "absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95",
              playClassName,
            )}
          >
            <Play className={cn("size-5 fill-gc-ink text-gc-ink", playIconClassName)} />
          </span>
          {caption}
        </>
      )}
    </>
  );

  if (!isPlayable) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-gc-md bg-gc-surface-alt",
          className,
        )}
      >
        {visual}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative overflow-hidden rounded-gc-md bg-gc-surface-alt text-left",
        className,
      )}
    >
      {visual}
    </button>
  );
}

type IntroReelCardProps = {
  media: PublicProfileMedia | null;
  fallbackImageUrl: string | null;
  fallbackInitials?: string;
  onOpen: () => void;
  className?: string;
  /** Overlay label; defaults to the designs' "Intro reel". */
  label?: string;
};

/**
 * Tall intro-reel card. Falls back to the profile picture, without the badge or
 * play affordance, when the creator has no intro reel.
 */
export function IntroReelCard({
  media,
  fallbackImageUrl,
  fallbackInitials,
  onOpen,
  className,
  label = "Intro reel",
}: IntroReelCardProps) {
  return (
    <HeroVisual
      media={media}
      fallbackImageUrl={fallbackImageUrl}
      fallbackInitials={fallbackInitials}
      onOpen={onOpen}
      className={cn(
        "aspect-[9/16] shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
        className,
      )}
      badge={
        <span className="absolute left-3.5 top-3.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold">
          {label}
        </span>
      }
    />
  );
}

/** Shared legal/footer strip. */
export function PublicPageFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mx-auto px-5 pb-10 text-[13px] leading-relaxed text-gc-muted-soft",
        className,
      )}
    >
      <p className="m-0">
        © {new Date().getFullYear()} GoCollab · This public profile is shared by
        the creator. Bookings &amp; payments are handled securely on GoCollab.
      </p>
    </footer>
  );
}
