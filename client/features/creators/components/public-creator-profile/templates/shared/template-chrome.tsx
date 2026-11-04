"use client";

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

type IntroReelCardProps = {
  media: PublicProfileMedia;
  onOpen: () => void;
  className?: string;
  /** Overlay label; defaults to the designs' "Intro reel". */
  label?: string;
};

/** Tall intro-reel card with a play affordance. */
export function IntroReelCard({
  media,
  onOpen,
  className,
  label = "Intro reel",
}: IntroReelCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative aspect-[9/16] overflow-hidden rounded-gc-md bg-gc-surface-alt shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {media.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote S3 thumbnail
        <img
          src={media.thumbnailUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="eager"
          decoding="async"
        />
      ) : (
        <video
          src={media.videoUrl}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}
      <span className="absolute left-3.5 top-3.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold">
        {label}
      </span>
      <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95">
        <Play className="size-5 fill-gc-ink text-gc-ink" />
      </span>
    </button>
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
