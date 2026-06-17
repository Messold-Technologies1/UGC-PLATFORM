"use client";

import { X } from "lucide-react";
import { useOnborda, type CardComponentProps } from "onborda";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Branded card rendered by Onborda for every tour step. Styling intentionally
 * mirrors the dashboard design system (card surface, primary accent, heading
 * font) so the tour feels native rather than bolted on.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const { closeOnborda } = useOnborda();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="relative w-[320px] max-w-[88vw] rounded-2xl border border-border/60 bg-card text-card-foreground shadow-2xl shadow-black/10">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-2">
          {step.icon ? (
            <span aria-hidden className="text-lg leading-none">
              {step.icon}
            </span>
          ) : null}
          <h3 className="font-heading text-base font-bold leading-tight">
            {step.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => closeOnborda()}
          aria-label="Skip tour"
          className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="px-5 pt-2 text-sm leading-relaxed text-muted-foreground">
        {step.content}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-4">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentStep
                  ? "w-4 bg-primary"
                  : "w-1.5 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button variant="ghost" size="sm" onClick={() => prevStep()}>
              Back
            </Button>
          )}
          {isLastStep ? (
            <Button size="sm" onClick={() => closeOnborda()}>
              Done
            </Button>
          ) : (
            <Button size="sm" onClick={() => nextStep()}>
              Next
            </Button>
          )}
        </div>
      </div>

      {/* Pointer notch coloured to match the card surface. */}
      <span className="text-card">{arrow}</span>
    </div>
  );
}
