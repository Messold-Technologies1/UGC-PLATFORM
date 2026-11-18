import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";

/**
 * The standing note telling creators to deliver through GoCollab rather than
 * sending files to the brand directly.
 *
 * Shown in full on the creator orders list and on every order detail — the
 * whole point is the reasoning, so it is never truncated or collapsed behind
 * a "read more".
 *
 * Each paragraph carries the icon that matches what it says, so five
 * paragraphs scan as five points rather than a wall of text. That matters
 * most on the order detail, where this sits above the work every time an
 * order is opened.
 */
const POINTS: { icon: LucideIcon; text: React.ReactNode }[] = [
  {
    icon: Ban,
    text: (
      <>
        Once you receive an order on GoCollab, we strongly recommend that you{" "}
        <strong className="font-extrabold text-foreground">
          do not share the final content/video directly with the brand
        </strong>
        , even if they request it.
      </>
    ),
  },
  {
    icon: Upload,
    text: "Please ensure that all content is submitted through the GoCollab platform for review and approval.",
  },
  {
    icon: AlertTriangle,
    text: "The reason is simple: if you share the video directly with the brand and they later reject the content on the platform, we may have no option but to refund the brand. In such a situation, your hard work, time and effort could go uncompensated.",
  },
  {
    icon: ShieldCheck,
    text: "We want to make sure your efforts are protected and that you get paid for the work you deliver.",
  },
  {
    icon: CheckCircle2,
    text: "So, please keep all final content submissions within GoCollab. Let's ensure a fair and secure experience for everyone.",
  },
];

export function CreatorContentPolicyNote({
  className,
}: {
  className?: string;
}) {
  return (
    <section
      role="note"
      aria-labelledby="creator-content-policy-heading"
      className={`overflow-hidden rounded-gc-lg border border-border bg-card shadow-pop ${className ?? ""}`}
    >
      {/* The ink the platform already uses for primary buttons and the payout
          banner, so this reads as GoCollab speaking rather than as a warning
          about this particular order. */}
      <div className="flex items-center gap-2.5 bg-foreground px-5 py-3 sm:px-6">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gc-brand">
          <AlertCircle className="size-3.5 text-white" aria-hidden="true" />
        </span>
        <h2
          id="creator-content-policy-heading"
          className="text-[11px] font-extrabold uppercase tracking-[0.09em] text-background"
        >
          Important Note
        </h2>
      </div>

      <div className="px-5 pt-4 pb-5 sm:px-6">
        {/* The banner spans the page, but the measure stops at ~70 characters:
            five paragraphs the full width of a desktop screen is the one way
            to guarantee nobody reads them. */}
        <ul className="flex max-w-[70ch] flex-col gap-3.5">
          {POINTS.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-3.5 text-gc-ink-muted" aria-hidden="true" />
              </span>
              <p className="text-sm leading-relaxed text-gc-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
