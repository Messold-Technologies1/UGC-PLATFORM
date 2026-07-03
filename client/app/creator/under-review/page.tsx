import {
  CheckCircle2,
  Circle,
  Clock3,
  Mail,
  Sparkles,
} from "lucide-react";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";

const APPROVAL_FIRST_STEPS = [
  {
    id: "submitted",
    label: "Application submitted",
    description: "Your profile and portfolio are in.",
    status: "complete" as const,
  },
  {
    id: "review",
    label: "Under review",
    description: "Our team is reviewing your work.",
    status: "active" as const,
  },
  {
    id: "live",
    label: "Go live",
    description: "Start receiving brand briefs.",
    status: "upcoming" as const,
  },
];

const PROFILE_FIRST_STEPS = [
  {
    id: "profile",
    label: "Profile completed",
    description: "Your profile and portfolio are ready.",
    status: "complete" as const,
  },
  {
    id: "review",
    label: "Under admin review",
    description: "Our team is reviewing your profile.",
    status: "active" as const,
  },
  {
    id: "live",
    label: "Go live on marketplace",
    description: "Brands can discover you and send briefs.",
    status: "upcoming" as const,
  },
];

export default function UnderReviewPage() {
  const profileFirst = isProfileFirstOnboardingMode();
  const reviewSteps = profileFirst ? PROFILE_FIRST_STEPS : APPROVAL_FIRST_STEPS;

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -mx-4 -mt-4 -mb-8 sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12 overflow-hidden -z-10 bg-[#fdfcfb] dark:bg-slate-950"
      >
        <div
          aria-hidden
          className="absolute -left-24 top-1/4 size-72 rounded-full bg-[#ef3e51]/15 blur-3xl dark:bg-[#ef3e51]/10"
        />
        <div
          aria-hidden
          className="absolute -right-16 bottom-1/4 size-80 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/10"
        />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="flex min-h-[min(34rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/95 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.22)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
          <div className="border-b border-slate-100 bg-gradient-to-br from-[#fff5f6] via-white to-[#f8f5ff] px-5 py-6 sm:px-8 sm:py-8 text-center dark:border-slate-800 dark:from-red-500/10 dark:via-slate-900 dark:to-violet-500/10">
            <div className="relative mx-auto mb-5 flex size-16 sm:size-[4.5rem] items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#ef3e51]/20 [animation-duration:2.4s]" />
              <span className="absolute inset-2 rounded-full bg-[#ef3e51]/10" />
              <span className="relative flex size-14 sm:size-[3.75rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#ef3e51] to-[#c42d48] text-white shadow-lg shadow-[#ef3e51]/30">
                <Sparkles className="size-7" strokeWidth={1.75} />
              </span>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#ef3e51]">
              Almost there
            </p>
            <h1 className="font-heading mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {profileFirst
                ? "Your profile is under review"
                : "Your application is under review"}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {profileFirst ? (
                <>
                  Thanks for completing your profile on Go Collab. We&apos;re
                  reviewing your work and will email you as soon as you&apos;re
                  approved to go live on the marketplace.
                </>
              ) : (
                <>
                  Thanks for joining Go Collab. We&apos;re reviewing your
                  application and will email you as soon as you&apos;re approved
                  to work with brands.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-6 px-5 py-6 sm:px-8 sm:py-7">
            <ol className="grid gap-3 sm:grid-cols-3">
              {reviewSteps.map((step) => (
                <li
                  key={step.id}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <StepIcon status={step.status} />
                  <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                    {step.label}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile
                icon={Clock3}
                title="Typical timeline"
                description="Most reviews are completed within 24–48 hours."
              />
              <InfoTile
                icon={Mail}
                title="Check your inbox"
                description="We'll send approval updates to the email you registered with."
              />
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-500">
          {profileFirst
            ? "You can still edit your profile while we review — we'll notify you by email."
            : "No action needed right now — sit tight and we'll take it from here."}
        </p>
      </div>
    </div>
  );
}

function StepIcon({
  status,
}: {
  status: "complete" | "active" | "upcoming";
}) {
  if (status === "complete") {
    return (
      <span className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <CheckCircle2 className="size-5" strokeWidth={2} />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="flex size-10 items-center justify-center rounded-full bg-[#ffebed] text-[#ef3e51] ring-2 ring-[#ef3e51]/25 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-500/30">
        <Clock3 className="size-5 animate-pulse" strokeWidth={2} />
      </span>
    );
  }

  return (
    <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      <Circle className="size-5" strokeWidth={2} />
    </span>
  );
}

function InfoTile({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Clock3;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#fff5f6] text-[#ef3e51] dark:bg-red-500/10 dark:text-red-400">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}
