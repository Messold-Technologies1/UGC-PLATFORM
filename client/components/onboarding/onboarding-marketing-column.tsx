"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardingMarketingColumnProps = {
  accentClassName: string;
  title: string;
  points: readonly string[];
  footer?: ReactNode;
  className?: string;
};

export function OnboardingMarketingColumn({
  accentClassName,
  title,
  points,
  footer,
  className,
}: OnboardingMarketingColumnProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-56 flex-col justify-between overflow-hidden p-8 text-white md:min-h-0",
        accentClassName,
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, white 0%, transparent 45%),
            radial-gradient(circle at 80% 20%, white 0%, transparent 40%)`,
        }}
      />
      <div className="relative z-1 space-y-6">
        <p className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
          {title}
        </p>
        <ul className="space-y-3 text-sm leading-relaxed text-white/95 md:text-[0.9375rem]">
          {points.map((line) => (
            <li key={line} className="flex gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Check className="size-3" strokeWidth={2.5} />
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
      {footer ? (
        <div className="relative z-1 mt-8 hidden shrink-0 md:block">{footer}</div>
      ) : null}
    </div>
  );
}
