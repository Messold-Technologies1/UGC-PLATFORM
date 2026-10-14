"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

import "./creator-profile-wizard.animations.css";

/** Root wrapper — replaces `.cw-root`. */
export function CwRoot({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[1200px] pb-10",
        "max-sm:px-4 max-[380px]:px-3",
        "max-[960px]:overflow-x-clip max-[960px]:overflow-y-visible",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwLayout({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-6 grid grid-cols-1 items-start gap-4 min-[961px]:mt-6 min-[961px]:grid-cols-[320px_minmax(0,1fr)] min-[961px]:gap-12",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-7 rounded-[18px] border border-border bg-card p-8 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] max-sm:gap-[22px] max-sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwHr({
  soft = false,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { soft?: boolean }) {
  return (
    <div
      className={cn(
        "h-px bg-border",
        soft && "bg-border/60",
        className,
      )}
      {...props}
    />
  );
}

export function CwField({
  className,
  children,
  span2 = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { span2?: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        span2 && "col-span-2 max-[560px]:col-span-1",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwFieldLabel({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "flex items-center gap-[5px] text-[13px] font-semibold text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function CwReq({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold text-destructive", className)} aria-hidden>
      *
    </span>
  );
}

export const CwInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function CwInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[10px] border-[1.4px] border-border bg-background px-3.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground",
        "focus:border-primary/55 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_10%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});

export const CwTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function CwTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-y rounded-[10px] border-[1.4px] border-border bg-background px-3.5 py-2.5 text-sm leading-normal text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground",
        "focus:border-primary/55 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_10%,transparent)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});

export function CwFieldWarn({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mt-1.5 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2 text-[12.5px] font-medium leading-snug text-amber-900 dark:text-amber-200",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CwGrid2({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 min-[561px]:grid-cols-2 min-[561px]:gap-x-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwFacet({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CwFacetLabel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 text-[13.5px] font-semibold text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwFacetHelp({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-[12.5px] leading-snug text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function CwFacetCount({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function CwBtn({
  variant = "ghost",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "primary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "ghost" &&
          "border-[1.4px] border-border bg-card text-foreground hover:bg-muted",
        variant === "primary" &&
          "border border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CwConfirm({
  checked,
  disabled,
  onToggle,
  title,
  description,
  className,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-checked={checked}
      data-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3.5 rounded-xl border-2 border-zinc-400 bg-white p-4 text-left transition-[background,border-color]",
        checked && "border-primary bg-primary/[0.06]",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border-2 border-zinc-400 bg-white",
          checked && "border-primary bg-primary text-white",
        )}
        aria-hidden
      >
        {checked ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.2 4.8 8.5 9.5 3.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-foreground">
          {title}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">
            {description}
          </span>
        ) : null}
        {children}
      </span>
    </button>
  );
}

/** Select field wrapper — pairs CwFieldLabel with PeSelectField (hideLabel). */
export function CwSelectField({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        "[&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:rounded-[10px] [&_[data-slot=select-trigger]]:border-[1.4px] [&_[data-slot=select-trigger]]:text-sm",
        "[&_button[role=combobox]]:h-11 [&_button[role=combobox]]:rounded-[10px] [&_button[role=combobox]]:border-[1.4px] [&_button[role=combobox]]:text-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* =========================================================================
   Shell primitives — rail, mobile stepper, pane, footer, tip, banners, preview
   ========================================================================= */

/** Mobile-only top stepper (hidden ≥961px). */
export function CwMobileStepper({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "hidden max-[960px]:-mx-4 max-[960px]:block max-[960px]:border-b max-[960px]:border-border max-[960px]:bg-white max-[960px]:px-4 max-[960px]:pt-3 max-[960px]:pb-3.5",
        "max-[380px]:-mx-3 max-[380px]:px-3",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwMobileStepperRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CwMobileNav({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-[1.4px] border-border bg-white text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-35",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CwMobileStepperCopy({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-w-0 flex-1 text-center", className)} {...props}>
      {children}
    </div>
  );
}

export function CwMobileStepperMeta({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "m-0 text-[11px] font-bold tracking-[0.08em] text-primary uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CwMobileStepperTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "mt-1 mb-0 text-xl leading-tight font-bold tracking-[-0.02em] text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function CwMobileSegments({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-3.5 flex gap-1.5", className)}
      aria-hidden
      {...props}
    >
      {children}
    </div>
  );
}

export function CwMobileSegment({
  filled,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { filled?: boolean }) {
  return (
    <span
      data-filled={filled}
      className={cn(
        "h-1.5 flex-1 rounded-full bg-[#e7e7ea]",
        filled && "bg-primary",
        className,
      )}
      {...props}
    />
  );
}

/** Sticky left rail — desktop only (hidden ≤960px). */
export function CwRail({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "sticky top-6 flex min-w-0 flex-col gap-6 max-[960px]:hidden",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
}

export function CwRailTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "m-0 text-[22px] leading-snug font-bold tracking-[-0.02em] text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CwRailSub({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mt-2 mb-0 text-[13.5px] leading-[1.55] text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CwStrength({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_20%,transparent)] bg-[color-mix(in_oklab,var(--primary)_5%,transparent)] p-[18px]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwStrengthHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-bold tracking-[0.06em] text-primary uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwStrengthPct({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-2.5 text-[34px] leading-none font-bold tracking-[-0.02em] text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwStrengthTrack({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative mt-3 h-1.5 w-full overflow-hidden rounded-full border border-[color-mix(in_oklab,var(--primary)_20%,transparent)] bg-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwStrengthFill({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-full rounded-full bg-primary", className)}
      {...props}
    />
  );
}

export function CwStrengthHint({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mt-3 mb-0 text-[12.5px] leading-normal text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/** Vertical step list (desktop rail). Connectors are absolute divs, not ::after. */
export function CwSteps({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("relative flex flex-col gap-0.5", className)}
      {...props}
    >
      {children}
    </nav>
  );
}

export function CwStep({
  active,
  done,
  showConnector,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  done?: boolean;
  /** Draw the line to the next step (omit on last). */
  showConnector?: boolean;
}) {
  return (
    <button
      type="button"
      data-active={active}
      data-done={done}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-3 rounded-[10px] border-0 bg-transparent px-3 py-[11px] text-left transition-colors duration-150",
        "disabled:cursor-default",
        !active && "enabled:hover:bg-muted",
        active &&
          "bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] cw-anim-step-glow",
        className,
      )}
      {...props}
    >
      {showConnector ? (
        <span
          aria-hidden
          className={cn(
            /* Dot centre: pl-12 + r-11 = 23px; pt-11 + r-11 = 22px. Gap = 2px. */
            "pointer-events-none absolute top-[22px] left-[23px] z-0 h-[calc(100%+2px)] w-0.5 -translate-x-1/2 bg-border",
            done && "bg-primary",
          )}
        />
      ) : null}
      {children}
    </button>
  );
}

export function CwStepDot({
  active,
  done,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  done?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative z-[1] flex size-[22px] shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold text-muted-foreground",
        (active || done) &&
          "border-primary bg-primary font-bold text-primary-foreground",
        done && "cw-anim-tick-pop",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function CwStepLabel({
  active,
  done,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
  done?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-sm font-medium whitespace-nowrap text-muted-foreground",
        active && "font-semibold text-primary",
        done && !active && "text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function CwTip({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[14px] bg-muted px-4 py-3.5 max-[960px]:hidden",
        "[&_svg]:mt-0.5 [&_svg]:shrink-0 [&_svg]:text-[#f59e0b]",
        "[&_p]:m-0 [&_p]:text-[12.5px] [&_p]:leading-[1.55] [&_p]:text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwPane({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-7", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Desktop pane header — hidden ≤960px (mobile stepper replaces it). */
export function CwPaneHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 max-[960px]:hidden",
        "[&>div]:min-w-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwPaneIcon({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function CwPaneTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "m-0 text-[30px] leading-[1.15] font-bold tracking-[-0.02em] text-foreground max-sm:text-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

export function CwPaneTag({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-2 mb-0 text-[15px] text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CwReviewBanner({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-4 rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_28%,transparent)] bg-[color-mix(in_oklab,var(--primary)_8%,var(--card))] px-[18px] py-3.5",
        "max-sm:flex-col max-sm:items-stretch",
        "[&_button]:shrink-0 [&_button]:whitespace-nowrap max-sm:[&_button]:w-full",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwReviewBannerCopy({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-w-0 items-start gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CwReviewBannerIcon({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("mt-0.5 shrink-0 text-primary", className)}
      {...props}
    />
  );
}

export function CwReviewBannerTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "m-0 text-[14.5px] leading-snug font-bold text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CwReviewBannerText({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "mt-1 mb-0 text-[13.5px] leading-snug text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CwFoot({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col items-stretch gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CwFootNote({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-[12.5px] text-muted-foreground", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function CwFootActions({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex w-full items-stretch gap-3 max-sm:flex-col",
        "[&_button]:flex-1 [&_button]:px-4 max-sm:[&_button]:w-full max-sm:[&_button]:flex-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Optional “How brands see you” preview card (shell primitive for reuse). */
export function CwPreview({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-border bg-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwPreviewHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border px-4 pt-3.5 pb-3 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwPreviewBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-3 p-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CwPreviewAvatar({
  empty,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { empty?: boolean }) {
  return (
    <div
      data-empty={empty}
      className={cn(
        "size-12 shrink-0 overflow-hidden rounded-full bg-muted",
        empty && "border-[1.4px] border-dashed border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwPreviewMeta({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props}>
      {children}
    </div>
  );
}

export function CwPreviewName({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "truncate text-sm font-semibold text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CwPreviewSkel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("h-[11px] w-[120px] rounded-full bg-muted", className)}
      {...props}
    />
  );
}

export function CwPreviewLangs({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-wrap gap-1.25", className)} {...props}>
      {children}
    </div>
  );
}

export function CwPreviewPill({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_10%,transparent)] px-2 text-[10.5px] font-semibold text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function CwPreviewNote({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "m-0 px-4 pb-4 text-[11.5px] leading-normal text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}
