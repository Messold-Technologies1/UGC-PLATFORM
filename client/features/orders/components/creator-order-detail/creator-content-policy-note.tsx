/**
 * The standing note telling creators to deliver through GoCollab rather than
 * sending files to the brand directly.
 *
 * Shown on the creator orders list and on every order detail. Every paragraph
 * is here in full — the reasoning is the point, so nothing is truncated or
 * hidden behind a "read more" — but it is set as plain prose and kept tight,
 * because this sits above the work on every single order view.
 */
const PARAGRAPHS: React.ReactNode[] = [
  <>
    Once you receive an order on GoCollab, we strongly recommend that you{" "}
    <strong className="font-bold text-foreground">
      do not share the final content/video directly with the brand
    </strong>
    , even if they request it. Please ensure that all content is submitted
    through the GoCollab platform for review and approval.
  </>,
  "The reason is simple: if you share the video directly with the brand and they later reject the content on the platform, we may have no option but to refund the brand. In such a situation, your hard work, time and effort could go uncompensated.",
  "We want to make sure your efforts are protected and that you get paid for the work you deliver.",
  "So, please keep all final content submissions within GoCollab. Let's ensure a fair and secure experience for everyone.",
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
      className={`overflow-hidden rounded-gc-md border border-border bg-card ${className ?? ""}`}
    >
      {/* The ink the platform already uses for primary buttons and the payout
          banner, so this reads as GoCollab speaking rather than as a warning
          about this particular order. */}
      <div className="bg-foreground px-4 py-2 sm:px-5">
        <h2
          id="creator-content-policy-heading"
          className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-background"
        >
          Important Note
        </h2>
      </div>

      <div className="space-y-2 px-4 py-3.5 sm:px-5">
        {PARAGRAPHS.map((text, i) => (
          <p key={i} className="text-[13px] leading-[1.6] text-gc-ink-soft">
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}
